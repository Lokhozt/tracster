import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { eventSchema } from "@/lib/validations";
import { canEditEvent, canViewEvent, validateEventTypeFields } from "@/lib/events";
import { getEventType, eventKindAllowsChoreographyLinks, isGenericEventKind } from "@/lib/event-types";
import { resolveLocationFromParsed } from "@/lib/locations";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";

type RouteContext = { params: Promise<{ id: string }> };

async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      type: true,
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { user: { lastName: "asc" } },
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

  if (!(await canViewEvent(id, user.id))) {
    return forbidden();
  }

  const event = await getEvent(id);
  if (!event) {
    return notFound("Event");
  }

  return Response.json({ event });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return notFound("Event");
  }

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const eventType = await getEventType(parsed.data.typeId);
  if (!eventType) {
    return jsonError("Selected event type was not found.");
  }

  const fieldError = await validateEventTypeFields({
    type: eventType,
    title: parsed.data.title,
    choreographyId: parsed.data.choreographyId,
    choreographyIds: parsed.data.choreographyIds,
    groupId: parsed.data.groupId,
  });
  if (fieldError) {
    return jsonError(fieldError);
  }

  const location = await resolveLocationFromParsed(parsed.data);
  if ("error" in location) {
    return jsonError(location.error);
  }

  const isGeneric = isGenericEventKind(eventType.kind);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.eventChoreography.deleteMany({ where: { eventId: id } });

    return tx.event.update({
      where: { id },
      data: {
        typeId: eventType.id,
        title: parsed.data.title?.trim() ?? "",
        description: isGeneric ? parsed.data.description : null,
        notes: isGeneric ? null : parsed.data.notes,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        locationId: location.locationId,
        location: location.location,
        allowParticipantJoin: isGeneric ? (parsed.data.allowParticipantJoin ?? false) : false,
        allowJoinRequests: isGeneric ? (parsed.data.allowJoinRequests ?? false) : false,
        hideFromNonParticipants: isGeneric
          ? (parsed.data.hideFromNonParticipants ?? true)
          : true,
        choreographyId: eventType.kind === "REHEARSAL" ? parsed.data.choreographyId ?? null : null,
        groupId: eventType.kind === "REHEARSAL" ? parsed.data.groupId ?? null : null,
        choreographies:
          eventKindAllowsChoreographyLinks(eventType.kind) && parsed.data.choreographyIds?.length
            ? {
                create: parsed.data.choreographyIds.map((choreographyId) => ({
                  choreographyId,
                })),
              }
            : undefined,
      },
      include: {
        type: true,
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  });
  await syncGoogleEventBestEffort(id);

  return Response.json({ event: updated });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  await prisma.event.delete({ where: { id } });
  await syncGoogleEventBestEffort(id);

  return Response.json({ ok: true });
}
