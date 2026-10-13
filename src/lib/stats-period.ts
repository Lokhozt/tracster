import { differenceInMinutes } from "date-fns";
import { resolveIntervalEnd } from "@/lib/conflicts";

export {
  defaultAssociationStatsPeriodEnd,
  defaultAssociationStatsPeriodStart,
  formatDateInputValue,
} from "@/lib/stats-period-client";

export function parseDateInputStart(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function parseDateInputEnd(value: string): Date | null {
  const start = parseDateInputStart(value);
  if (!start) {
    return null;
  }
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
}

export function intervalOverlapsRange(
  startsAt: Date,
  endsAt: Date,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  return startsAt < rangeEnd && endsAt > rangeStart;
}

export function clippedRangeMinutes(
  startsAt: Date,
  endsAt: Date,
  rangeStart: Date,
  rangeEnd: Date,
): number {
  const overlapStart = new Date(Math.max(startsAt.getTime(), rangeStart.getTime()));
  const overlapEnd = new Date(Math.min(endsAt.getTime(), rangeEnd.getTime()));
  if (overlapEnd <= overlapStart) {
    return 0;
  }
  return Math.max(0, differenceInMinutes(overlapEnd, overlapStart));
}

export function rehearsalMinutes(rehearsal: { startsAt: Date; endsAt: Date | null }): number {
  const end = resolveIntervalEnd(rehearsal.startsAt, rehearsal.endsAt);
  return Math.max(0, differenceInMinutes(end, rehearsal.startsAt));
}

export function rehearsalOverlapsRange(
  rehearsal: { startsAt: Date; endsAt: Date | null },
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const end = resolveIntervalEnd(rehearsal.startsAt, rehearsal.endsAt);
  return intervalOverlapsRange(rehearsal.startsAt, end, rangeStart, rangeEnd);
}
