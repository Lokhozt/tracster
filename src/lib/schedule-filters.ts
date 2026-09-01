import { addMonths, addWeeks } from "date-fns";
import { defaultEventTitle, isGenericEventKind, type EventKind } from "@/lib/event-type-helpers";

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
  availabilityStatus: "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | null;
  href: string;
  canEdit: boolean;
};

export function withParticipantTooltip(base: string, names: string[]) {
  if (names.length === 0) {
    return base;
  }
  return `${base}\nParticipants: ${names.join(", ")}`;
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
