import { addMonths, addWeeks } from "date-fns";
import { defaultEventTitle, isGenericEventKind, type EventKind } from "@/lib/event-type-helpers";

type MessageTranslator = (key: string, values?: Record<string, string | number>) => string;

export type SerializedScheduleEvent = {
  id: string;
  typeId: string;
  typeName: string;
  typeKind: EventKind | null;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  choreographyId: string | null;
  choreographyTitle: string | null;
  participantNames: string[];
  isMember: boolean;
  isParticipating: boolean;
  isEventParticipant: boolean;
  allowParticipantJoin: boolean;
  allowJoinRequests: boolean;
  hasPendingJoinRequest: boolean;
  hasUpcomingSeriesEvents: boolean;
  availabilityStatus: "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | null;
  href: string;
  canEdit: boolean;
};

export function withParticipantTooltip(
  base: string,
  names: string[],
  t?: MessageTranslator,
) {
  if (names.length === 0) {
    return base;
  }
  const participantNames = names.join(", ");
  return `${base}\n${
    t ? t("participantsTooltip", { names: participantNames }) : `Participants: ${participantNames}`
  }`;
}

export function withSchedulingTooltip(
  base: string,
  {
    choreographerNames = [],
    participantNames = [],
    unavailableNames = [],
    engagedNames = [],
  }: {
    choreographerNames?: string[];
    participantNames?: string[];
    unavailableNames?: string[];
    engagedNames?: string[];
  },
  t?: MessageTranslator,
) {
  const lines = [base];
  const choreographers = choreographerNames.join(", ");
  if (choreographers) {
    lines.push(
      t
        ? t("choreographersTooltip", { names: choreographers })
        : `Choreographers: ${choreographers}`,
    );
  }
  const participants = participantNames.join(", ");
  if (participants) {
    lines.push(
      t ? t("participantsTooltip", { names: participants }) : `Participants: ${participants}`,
    );
  }
  const unavailable = unavailableNames.join(", ");
  if (unavailable) {
    lines.push(
      t
        ? t("scheduleUnavailableConflict", { names: unavailable })
        : `Unavailable: ${unavailable}`,
    );
  }
  const engaged = engagedNames.join(", ");
  if (engaged) {
    lines.push(
      t
        ? t("scheduleEngagedConflict", { names: engaged })
        : `In another rehearsal: ${engaged}`,
    );
  }
  return lines.join("\n");
}

export type UpcomingEventRange = "all" | "week" | "month";

export function scheduleEventLabel(event: SerializedScheduleEvent) {
  return defaultEventTitle(
    { name: event.typeName, kind: event.typeKind },
    event.title,
  );
}

export function isRehearsalScheduleEvent(event: SerializedScheduleEvent) {
  return event.typeKind === "REHEARSAL";
}

export function isGenericScheduleEvent(event: SerializedScheduleEvent) {
  return isGenericEventKind(event.typeKind);
}

export function filterUpcomingScheduleEvents(
  events: SerializedScheduleEvent[],
  {
    range,
    hideNonParticipating,
    now = new Date(),
  }: {
    range: UpcomingEventRange;
    hideNonParticipating: boolean;
    now?: Date;
  },
) {
  const until =
    range === "week" ? addWeeks(now, 1) : range === "month" ? addMonths(now, 1) : null;

  return events.filter((event) => {
    if (until && new Date(event.startsAt) >= until) {
      return false;
    }
    if (hideNonParticipating && !event.isParticipating) {
      return false;
    }
    return true;
  });
}
