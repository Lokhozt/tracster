import type { IntervalMs } from "@/lib/scheduling/types";

export function intervalsOverlap(a: IntervalMs, b: IntervalMs): boolean {
  return a.start < b.end && b.start < a.end;
}

export function intervalCovers(outer: IntervalMs, inner: IntervalMs): boolean {
  return inner.start >= outer.start && inner.end <= outer.end;
}

export function mergeIntervals(intervals: IntervalMs[]): IntervalMs[] {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: IntervalMs[] = [{ ...sorted[0] }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

export function subtractIntervals(window: IntervalMs, blocked: IntervalMs[]): IntervalMs[] {
  let remaining: IntervalMs[] = [window];

  for (const block of mergeIntervals(blocked)) {
    const next: IntervalMs[] = [];
    for (const piece of remaining) {
      if (!intervalsOverlap(piece, block)) {
        next.push(piece);
        continue;
      }
      if (block.start > piece.start) {
        next.push({ start: piece.start, end: Math.min(block.start, piece.end) });
      }
      if (block.end < piece.end) {
        next.push({ start: Math.max(block.end, piece.start), end: piece.end });
      }
    }
    remaining = next.filter((piece) => piece.end > piece.start);
  }

  return remaining;
}

export function hasFreeTime(unavailability: IntervalMs[], windows: IntervalMs[]): boolean {
  for (const window of windows) {
    if (subtractIntervals(window, unavailability).length > 0) {
      return true;
    }
  }
  return windows.length === 0;
}

export function overlapsAny(interval: IntervalMs, others: IntervalMs[]): boolean {
  return others.some((other) => intervalsOverlap(interval, other));
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDayKey(day: string): Date {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  return new Date(year, month - 1, dayOfMonth);
}

export function atLocalTime(day: Date, hour: number, minute = 0): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
}

export function snapUpToSlot(ms: number, slotMs: number): number {
  const date = new Date(ms);
  const dayStart = startOfLocalDay(date).getTime();
  const offset = ms - dayStart;
  const snapped = Math.ceil(offset / slotMs) * slotMs;
  return dayStart + snapped;
}
