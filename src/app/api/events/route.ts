import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { eventSchema } from "@/lib/validations";
import {
  canCreateEventOfType,
  choreographyLinksFromInput,
  competitorParticipantsAllowed,
  getUserEvents,
  participantIdsForChoreographyLinks,
  validateChoreographyLinkGroups,
  validateEventTypeFields,
} from "@/lib/events";
import { getEventType } from "@/lib/event-types";
import { eventKindAllowsChoreographyLinks, eventKindAllowsRepeat, isGenericEventKind } from "@/lib/event-type-helpers";
import { expandWeeklyOccurrences } from "@/lib/event-recurrence";
import { resolveLocationFromParsed } from "@/lib/locations";
import { canCreateEvent } from "@/lib/site-settings";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";
import { getServerTranslator, localizeEventType } from "@/i18n/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const events = await getUserEvents(
    user.id,
    await getServerTranslator(user.displayLanguage),
  );

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

  const choreographyLinks = choreographyLinksFromInput(parsed.data);
  const choreographyIds = choreographyLinks.map((link) => link.choreographyId);
  const fieldError = await validateEventTypeFields({
    type: eventType,
    title: parsed.data.title,
    choreographyId: parsed.data.choreographyId,
    choreographyIds,
    groupId: parsed.data.groupId,
  });
  if (fieldError) {
    return jsonError(fieldError);
  }

  const linkGroupError = await validateChoreographyLinkGroups(eventType.kind, choreographyLinks);
  if (linkGroupError) {
    return jsonError(linkGroupError);
  }

  const participantError = await competitorParticipantsAllowed(
    eventType.kind,
    parsed.data.participantIds ?? [],
  );
  if (participantError) {
    return jsonError(participantError);
  }

  const canCreateGeneric = await canCreateEvent(user.id);
  if (
    !(await canCreateEventOfType({
      userId: user.id,
      kind: eventType.kind,
      choreographyId: parsed.data.choreographyId,
      choreographyIds,
      canCreateGeneric,
    }))
  ) {
    return forbidden();
  }

  const location = await resolveLocationFromParsed(parsed.data);
  if ("error" in location) {
    return jsonError(location.error);
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  const submittedTitle = parsed.data.title?.trim() ?? "";
  const defaultRehearsalTitle =
    eventType.kind === "REHEARSAL" &&
    parsed.data.choreographyId &&
    !submittedTitle
      ? (
          await prisma.choreography.findUnique({
            where: { id: parsed.data.choreographyId },
            select: { title: true },
          })
        )?.title ?? ""
      : "";
  const title = submittedTitle || defaultRehearsalTitle;
  const repeating =
    parsed.data.repeatWeekday != null && parsed.data.repeatWeeks != null;

  if (repeating && !eventKindAllowsRepeat(eventType.kind)) {
    return jsonError("This event type cannot be repeated.");
  }

  const occurrences = repeating
    ? expandWeeklyOccurrences(
        startsAt,
        endsAt,
        parsed.data.repeatWeekday!,
        parsed.data.repeatWeeks!,
      )
    : [{ startsAt, endsAt }];

  const isGeneric = isGenericEventKind(eventType.kind);
  const linkedParticipantIds =
    eventType.kind === "DEMONSTRATION"
      ? await participantIdsForChoreographyLinks(choreographyLinks)
      : [];
  const participantIds = [
    ...new Set([...(isGeneric ? parsed.data.participantIds ?? [] : []), ...linkedParticipantIds]),
  ];
  const created = await prisma.$transaction(async (tx) => {
    const series =
      occurrences.length > 1 ? await tx.eventSeries.create({ data: {} }) : null;

    const events = [];
    for (const occurrence of occurrences) {
      events.push(
        await tx.event.create({
          data: {
            typeId: eventType.id,
            title,
            description: isGeneric ? parsed.data.description : null,
            notes: isGeneric ? null : parsed.data.notes,
            whatsappUrl: eventType.kind === "DEMONSTRATION" ? parsed.data.whatsappUrl ?? null : null,
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
            locationId: location.locationId,
            location: location.location,
            createdById: user.id,
            allowParticipantJoin: isGeneric ? (parsed.data.allowParticipantJoin ?? false) : false,
            allowJoinRequests: isGeneric ? (parsed.data.allowJoinRequests ?? false) : false,
            hideFromNonParticipants: isGeneric
              ? (parsed.data.hideFromNonParticipants ?? true)
              : true,
            choreographyId: eventType.kind === "REHEARSAL" ? parsed.data.choreographyId ?? null : null,
            groupId: eventType.kind === "REHEARSAL" ? parsed.data.groupId ?? null : null,
            seriesId: series?.id ?? null,
            participants: participantIds.length
              ? {
                  create: participantIds.map((userId) => ({ userId })),
                }
              : undefined,
            choreographies:
              eventKindAllowsChoreographyLinks(eventType.kind) && choreographyLinks.length
                ? {
                    create: choreographyLinks.map((link) => ({
                      choreographyId: link.choreographyId,
                      groupId: link.groupId ?? null,
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
        }),
      );
    }

    return events;
  });

  await Promise.all(created.map((event) => syncGoogleEventBestEffort(event.id)));

  const translator = await getServerTranslator(user.displayLanguage);
  const event = created[0];
  return Response.json({
    event: {
      ...event,
      type: localizeEventType(event.type, translator),
    },
  }, { status: 201 });
}
