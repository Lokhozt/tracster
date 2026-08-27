import { addMonths, addWeeks } from "date-fns";
// Type-only: keeps this module free of the Prisma client so clients can import it.
import type { SerializedScheduleEvent } from "@/lib/schedule";

export type UpcomingEventRange = "all" | "week" | "month";

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
