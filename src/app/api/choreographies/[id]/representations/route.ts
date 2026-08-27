import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import {
  choreographyRepresentationSchema,
  linkRepresentationSchema,
} from "@/lib/validations";
import { canEditChoreography } from "@/lib/permissions";
import { canEditEvent } from "@/lib/events";
import { getLinkableRepresentations } from "@/lib/representations";
import { resolveLocationFromParsed } from "@/lib/locations";
import { getEventTypeByKind } from "@/lib/event-types";

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
    const representation = await prisma.event.findUnique({
      where: { id: parsed.data.representationId },
      select: { id: true, type: { select: { kind: true } } },
    });

    if (!representation || representation.type.kind !== "REPRESENTATION") {
      return notFound("Representation");
    }

    if (!(await canEditEvent(parsed.data.representationId, user.id))) {
      return forbidden();
    }

    const link = await prisma.eventChoreography.upsert({
      where: {
        eventId_choreographyId: {
          choreographyId: id,
          eventId: parsed.data.representationId,
        },
      },
      update: {},
      create: {
        choreographyId: id,
        eventId: parsed.data.representationId,
      },
      include: {
        event: {
          include: {
            choreographies: {
              include: { choreography: { select: { id: true, title: true } } },
            },
          },
        },
      },
    });

    return Response.json(
      { representation: link.event, event: link.event },
      { status: 201 },
    );
  }

  const location = await resolveLocationFromParsed(parsed.data);
  if ("error" in location) {
    return jsonError(location.error);
  }

  const eventType = await getEventTypeByKind("REPRESENTATION");
  if (!eventType) {
    return jsonError("Representation event type is not configured.");
  }

  const representation = await prisma.event.create({
    data: {
      typeId: eventType.id,
      title: parsed.data.title ?? "",
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      locationId: location.locationId,
      location: location.location,
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

  return Response.json({ representation, event: representation }, { status: 201 });
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

  await prisma.eventChoreography.deleteMany({
    where: {
      choreographyId: id,
      eventId: parsed.data.representationId,
    },
  });

  return Response.json({ ok: true });
}
