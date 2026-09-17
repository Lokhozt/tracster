import { prisma } from "@/lib/db";
import { applyScheduleShift } from "@/lib/event-recurrence";
import { eventKindAllowsRepeat } from "@/lib/event-type-helpers";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";
import type { EventKind } from "@/lib/event-type-helpers";

export type SeriesEventRef = {
  id: string;
  seriesId: string | null;
  startsAt: Date;
};

export type SeriesUpdateTarget = {
  id: string;
  startsAt: Date;
};

export function hasUpcomingSeriesEvents(
  event: SeriesEventRef,
  siblings: SeriesEventRef[],
): boolean {
  if (!event.seriesId) {
    return false;
  }

  return siblings.some(
    (other) =>
      other.seriesId === event.seriesId &&
      other.id !== event.id &&
      other.startsAt.getTime() >= event.startsAt.getTime(),
  );
}

export async function loadSeriesSiblings(events: SeriesEventRef[]): Promise<SeriesEventRef[]> {
  const seriesIds = [
    ...new Set(events.map((event) => event.seriesId).filter((id): id is string => Boolean(id))),
  ];
  if (seriesIds.length === 0) {
    return [];
  }

  return prisma.event.findMany({
    where: { seriesId: { in: seriesIds } },
    select: { id: true, seriesId: true, startsAt: true },
  });
}

export async function deleteEmptySeries(seriesId: string | null | undefined) {
  if (!seriesId) {
    return;
  }

  const remaining = await prisma.event.count({ where: { seriesId } });
  if (remaining === 0) {
    await prisma.eventSeries.delete({ where: { id: seriesId } });
  }
}

export async function loadSeriesOrigin(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, seriesId: true, startsAt: true },
  });
}

export async function loadUpcomingSeriesTargets(
  origin: { id: string; seriesId: string | null; startsAt: Date },
  applyToUpcoming: boolean,
): Promise<SeriesUpdateTarget[]> {
  if (!applyToUpcoming || !origin.seriesId) {
    return [{ id: origin.id, startsAt: origin.startsAt }];
  }

  return prisma.event.findMany({
    where: {
      seriesId: origin.seriesId,
      startsAt: { gte: origin.startsAt },
    },
    select: { id: true, startsAt: true },
    orderBy: { startsAt: "asc" },
  });
}

export function seriesUpdateUnlink(
  origin: { seriesId: string | null },
  applyToUpcoming: boolean,
  nextKind: EventKind | null,
) {
  return !applyToUpcoming && Boolean(origin.seriesId) && !eventKindAllowsRepeat(nextKind);
}

export function shiftedOccurrence(
  originStartsAt: Date,
  nextStartsAt: Date,
  nextEndsAt: Date | null,
  targetStartsAt: Date,
) {
  return applyScheduleShift(originStartsAt, nextStartsAt, nextEndsAt, targetStartsAt);
}

export async function deleteEventsAndSync(ids: string[], seriesId: string | null) {
  await prisma.event.deleteMany({ where: { id: { in: ids } } });
  await deleteEmptySeries(seriesId);
  await Promise.all(ids.map((id) => syncGoogleEventBestEffort(id)));
}
