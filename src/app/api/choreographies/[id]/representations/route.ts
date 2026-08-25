import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import {
  choreographyRepresentationSchema,
  linkRepresentationSchema,
} from "@/lib/validations";
import { canEditChoreography } from "@/lib/permissions";
import { canEditRepresentation } from "@/lib/representations";
import { getLinkableRepresentations } from "@/lib/representations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const linkable = await getLinkableRepresentations(user.id, id);

  return Response.json({ representations: linkable });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const choreography = await prisma.choreography.findUnique({ where: { id } });
  if (!choreography) {
    return notFound("Choreography");
  }

  const body = await request.json();
  const parsed = choreographyRepresentationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  if (parsed.data.mode === "link") {
    const representation = await prisma.representation.findUnique({
      where: { id: parsed.data.representationId },
    });

    if (!representation) {
      return notFound("Representation");
    }

    if (!(await canEditRepresentation(parsed.data.representationId, user.id))) {
      return forbidden();
    }

    const link = await prisma.choreographyRepresentation.upsert({
      where: {
        choreographyId_representationId: {
          choreographyId: id,
          representationId: parsed.data.representationId,
        },
      },
      update: {},
      create: {
        choreographyId: id,
        representationId: parsed.data.representationId,
      },
      include: {
        representation: {
          include: {
            choreographies: {
              include: { choreography: { select: { id: true, title: true } } },
            },
          },
        },
      },
    });

    return Response.json({ representation: link.representation }, { status: 201 });
  }

  const representation = await prisma.representation.create({
    data: {
      title: parsed.data.title,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      location: parsed.data.location,
      notes: parsed.data.notes,
      createdById: user.id,
      choreographies: {
        create: { choreographyId: id },
      },
    },
    include: {
      choreographies: {
        include: { choreography: { select: { id: true, title: true } } },
      },
    },
  });

  return Response.json({ representation }, { status: 201 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = linkRepresentationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await prisma.choreographyRepresentation.deleteMany({
    where: {
      choreographyId: id,
      representationId: parsed.data.representationId,
    },
  });

  return Response.json({ ok: true });
}
