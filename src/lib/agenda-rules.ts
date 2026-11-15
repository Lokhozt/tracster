import { isPartyEventKind } from "@/lib/event-type-helpers";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";

/* What counts as "yours", shared by the Activité page and the calendar feed. */

/** A rehearsal the user leads, or answered "available" to. */
export function attendsRehearsal(event: SerializedScheduleEvent): boolean {
  return event.isChoreographer || event.availabilityStatus === "AVAILABLE";
}

/** The user declared taking part (the app does not record actual attendance). */
export function takesPart(event: SerializedScheduleEvent): boolean {
  if (event.typeKind === "REHEARSAL") {
    return attendsRehearsal(event);
  }
  if (event.typeKind && isPartyEventKind(event.typeKind)) {
    // Holding a bar slot counts as coming to the party.
    return event.isEventParticipant || event.isBarVolunteer;
  }
  return event.isParticipating;
}

/**
 * On the user's own agenda: rehearsals of their casts they did not decline (or lead), and the
 * other events they joined (a bar slot counts for a party). Also the calendar feed's "mine".
 */
export function isOnUsersAgenda(event: SerializedScheduleEvent): boolean {
  if (event.typeKind === "REHEARSAL") {
    return (event.isMember || event.isChoreographer) && event.availabilityStatus !== "UNAVAILABLE";
  }
  return takesPart(event);
}
