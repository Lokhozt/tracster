import { addWeeks, getDay } from "date-fns";

export const MIN_REPEAT_WEEKS = 2;
export const MAX_REPEAT_WEEKS = 52;

/** JavaScript `Date#getDay` values, Monday-first for UI. */
export const WEEKDAY_SELECT_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function shiftToWeekday(date: Date, weekday: number): Date {
  const next = new Date(date.getTime());
  const delta = (weekday - getDay(next) + 7) % 7;
  next.setDate(next.getDate() + delta);
  return next;
}

export function expandWeeklyOccurrences(
  startsAt: Date,
  endsAt: Date | null,
  weekday: number,
  weekCount: number,
): { startsAt: Date; endsAt: Date | null }[] {
  const firstStart = shiftToWeekday(startsAt, weekday);
  const durationMs = endsAt ? endsAt.getTime() - startsAt.getTime() : null;
  const occurrences: { startsAt: Date; endsAt: Date | null }[] = [];

  for (let week = 0; week < weekCount; week += 1) {
    const occurrenceStart = addWeeks(firstStart, week);
    occurrences.push({
      startsAt: occurrenceStart,
      endsAt:
        durationMs == null ? null : new Date(occurrenceStart.getTime() + durationMs),
    });
  }

  return occurrences;
}

export function applyScheduleShift(
  originalStart: Date,
  newStart: Date,
  newEnd: Date | null,
  targetStart: Date,
): { startsAt: Date; endsAt: Date | null } {
  const startsAt = new Date(targetStart.getTime() + (newStart.getTime() - originalStart.getTime()));
  return {
    startsAt,
    endsAt: newEnd ? new Date(startsAt.getTime() + (newEnd.getTime() - newStart.getTime())) : null,
  };
}
