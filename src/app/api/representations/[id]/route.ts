import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { representationSchema } from "@/lib/validations";
import {
  canEditRepresentation,
  canViewRepresentation,
} from "@/lib/representations";

type RouteContext = { params: Promise<{ id: string }> };

async function getRepresentation(id: string) {
  return prisma.representation.findUnique({
    where: { id },
    include: {
      choreographies: {
        include: { choreography: { select: { id: true, title: true } } },
      },
    },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canViewRepresentation(id, user.id))) {
    return forbidden();
  }

  const representation = await getRepresentation(id);
  if (!representation) {
    return notFound("Representation");
  }

  return Response.json({ representation });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditRepresentation(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = representationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const updated = await prisma.representation.update({
    where: { id },
    data: {
      title: parsed.data.title,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      location: parsed.data.location,
      notes: parsed.data.notes,
    },
    include: {
      choreographies: {
        include: { choreography: { select: { id: true, title: true } } },
      },
    },
  });

  return Response.json({ representation: updated });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditRepresentation(id, user.id))) {
    return forbidden();
  }

  await prisma.representation.delete({ where: { id } });

  return Response.json({ ok: true });
}
