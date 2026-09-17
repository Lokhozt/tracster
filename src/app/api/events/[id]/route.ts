import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { eventSchema } from "@/lib/validations";
import { canEditEvent, canViewEvent, validateEventTypeFields } from "@/lib/events";
import {
  getEventType,
  eventKindAllowsChoreographyLinks,
  eventKindAllowsRepeat,
  eventKindRestrictedToCompetitors,
  isGenericEventKind,
} from "@/lib/event-types";
import { hasGlobalAccess } from "@/lib/roles";
import { resolveLocationFromParsed } from "@/lib/locations";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";
import { getServerTranslator, localizeEventType } from "@/i18n/server";
import {
  deleteEmptySeries,
  deleteEventsAndSync,
  loadSeriesOrigin,
  loadUpcomingSeriesTargets,
  seriesUpdateUnlink,
  shiftedOccurrence,
} from "@/lib/event-series";

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

  return Response.json({
    event: {
      ...event,
      type: localizeEventType(event.type, await getServerTranslator(user.displayLanguage)),
    },
  });
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

  const origin = await loadSeriesOrigin(id);
  if (!origin) {
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

  if (
    eventKindRestrictedToCompetitors(eventType.kind) &&
    !user.isCompetitor &&
    !(await hasGlobalAccess(user.id))
  ) {
    return forbidden();
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

  const applyToUpcoming = Boolean(parsed.data.applyToUpcoming);
  const targets = await loadUpcomingSeriesTargets(origin, applyToUpcoming);
  if (applyToUpcoming && targets.length > 1 && !eventKindAllowsRepeat(eventType.kind)) {
    return jsonError("This event type cannot be repeated.");
  }

  for (const target of targets) {
    if (!(await canEditEvent(target.id, user.id))) {
      return forbidden();
    }
  }

  const unlinkFromSeries = seriesUpdateUnlink(origin, applyToUpcoming && targets.length > 1, eventType.kind);
  const isGeneric = isGenericEventKind(eventType.kind);
  const nextStartsAt = new Date(parsed.data.startsAt);
  const nextEndsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;

  const updated = await prisma.$transaction(async (tx) => {
    let current = null;
    for (const target of targets) {
      await tx.eventChoreography.deleteMany({ where: { eventId: target.id } });
      if (eventKindRestrictedToCompetitors(eventType.kind)) {
        await tx.eventParticipant.deleteMany({
          where: { eventId: target.id, user: { isCompetitor: false } },
        });
      }

      const schedule = shiftedOccurrence(
        origin.startsAt,
        nextStartsAt,
        nextEndsAt,
        target.startsAt,
      );

      const event = await tx.event.update({
        where: { id: target.id },
        data: {
          typeId: eventType.id,
          title: parsed.data.title?.trim() ?? "",
          description: isGeneric ? parsed.data.description : null,
          notes: isGeneric ? null : parsed.data.notes,
          startsAt: schedule.startsAt,
          endsAt: schedule.endsAt,
          locationId: location.locationId,
          location: location.location,
          allowParticipantJoin: isGeneric ? (parsed.data.allowParticipantJoin ?? false) : false,
          allowJoinRequests: isGeneric ? (parsed.data.allowJoinRequests ?? false) : false,
          hideFromNonParticipants: isGeneric
            ? (parsed.data.hideFromNonParticipants ?? true)
            : true,
          choreographyId: eventType.kind === "REHEARSAL" ? parsed.data.choreographyId ?? null : null,
          groupId: eventType.kind === "REHEARSAL" ? parsed.data.groupId ?? null : null,
          seriesId: unlinkFromSeries && target.id === id ? null : undefined,
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
      if (event.id === id) {
        current = event;
      }
    }
    return current;
  });

  if (!updated) {
    return notFound("Event");
  }

  if (unlinkFromSeries) {
    await deleteEmptySeries(origin.seriesId);
  }

  await Promise.all(targets.map((target) => syncGoogleEventBestEffort(target.id)));

  return Response.json({
    event: {
      ...updated,
      type: localizeEventType(updated.type, await getServerTranslator(user.displayLanguage)),
    },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  const origin = await loadSeriesOrigin(id);
  if (!origin) {
    return notFound("Event");
  }

  const applyToUpcoming = request.nextUrl.searchParams.get("upcoming") === "1";
  const targets = await loadUpcomingSeriesTargets(origin, applyToUpcoming);

  for (const target of targets) {
    if (!(await canEditEvent(target.id, user.id))) {
      return forbidden();
    }
  }

  await deleteEventsAndSync(
    targets.map((target) => target.id),
    origin.seriesId,
  );

  return Response.json({ ok: true });
}
