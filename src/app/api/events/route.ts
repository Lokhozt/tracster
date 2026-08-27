import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { eventSchema } from "@/lib/validations";
import {
  canCreateEventOfType,
  getUserEvents,
  validateEventTypeFields,
} from "@/lib/events";
import { getEventType } from "@/lib/event-types";
import { resolveLocationFromParsed } from "@/lib/locations";
import { canCreateEvent } from "@/lib/site-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const events = await getUserEvents(user.id);

  return Response.json({ events });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
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

  const canCreateGeneric = await canCreateEvent(user.id);
  if (
    !(await canCreateEventOfType({
      userId: user.id,
      kind: eventType.kind,
      choreographyId: parsed.data.choreographyId,
      choreographyIds: parsed.data.choreographyIds,
      canCreateGeneric,
    }))
  ) {
    return forbidden();
  }

  const location = await resolveLocationFromParsed(parsed.data);
  if ("error" in location) {
    return jsonError(location.error);
  }

  const isGeneric = eventType.kind !== "REPETITION" && eventType.kind !== "REPRESENTATION";
  const event = await prisma.event.create({
    data: {
      typeId: eventType.id,
      title: parsed.data.title?.trim() ?? "",
      description: isGeneric ? parsed.data.description : null,
      notes: isGeneric ? null : parsed.data.notes,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      locationId: location.locationId,
      location: location.location,
      createdById: user.id,
      allowParticipantJoin: isGeneric ? (parsed.data.allowParticipantJoin ?? false) : false,
      allowJoinRequests: isGeneric ? (parsed.data.allowJoinRequests ?? false) : false,
      hideFromNonParticipants: isGeneric
        ? (parsed.data.hideFromNonParticipants ?? true)
        : true,
      choreographyId: eventType.kind === "REPETITION" ? parsed.data.choreographyId ?? null : null,
      groupId: eventType.kind === "REPETITION" ? parsed.data.groupId ?? null : null,
      participants:
        isGeneric && parsed.data.participantIds?.length
          ? {
              create: parsed.data.participantIds.map((userId) => ({ userId })),
            }
          : undefined,
      choreographies:
        eventType.kind === "REPRESENTATION" && parsed.data.choreographyIds?.length
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

  return Response.json({ event }, { status: 201 });
}
