import { prisma } from "@/lib/db";
import { resolveIntervalEnd } from "@/lib/conflicts";
import {
  atLocalTime,
  hasFreeTime,
  intervalsOverlap,
  parseDayKey,
} from "@/lib/scheduling/intervals";
import {
  DEFAULT_LOCATION_END_HOUR,
  DEFAULT_LOCATION_START_HOUR,
  type IntervalMs,
  type SchedulingAvailabilityBand,
} from "@/lib/scheduling/types";

type PlacementInput = {
  itemId: string;
  choreographyId: string;
  groupId?: string | null;
  startsAt: string;
  endsAt: string;
};

type Audience = {
  participants: string[];
  choreographers: string[];
};

const SLOT_MINUTES = 10;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;

export async function buildSchedulingAvailabilityHeatmap(
  selectedItemId: string,
  placements: PlacementInput[],
  days: string[],
): Promise<{ bands: SchedulingAvailabilityBand[] } | { error: string }> {
  const selectedPlacement = placements.find((placement) => placement.itemId === selectedItemId);
  if (!selectedPlacement) {
    return { error: "The selected choreography was not found in the planning." };
  }

  const choreographyIds = [...new Set(placements.map((placement) => placement.choreographyId))];
  const choreographies = await prisma.choreography.findMany({
    where: { id: { in: choreographyIds } },
    select: {
      id: true,
      choreographers: { select: { userId: true } },
      members: { select: { userId: true } },
      groups: {
        select: {
          id: true,
          members: { select: { userId: true } },
        },
      },
    },
  });
  if (choreographies.length !== choreographyIds.length) {
    return { error: "One of the selected choreographies was not found." };
  }

  const choreographyById = new Map(
    choreographies.map((choreography) => [choreography.id, choreography]),
  );
  const audienceByItem = new Map<string, Audience>();
  for (const placement of placements) {
    const choreography = choreographyById.get(placement.choreographyId);
    if (!choreography) {
      return { error: "One of the selected choreographies was not found." };
    }
    const group = placement.groupId
      ? choreography.groups.find((entry) => entry.id === placement.groupId)
      : null;
    if (placement.groupId && !group) {
      return { error: "Selected group does not belong to this choreography." };
    }
    audienceByItem.set(placement.itemId, {
      participants: (group?.members ?? choreography.members).map((entry) => entry.userId),
      choreographers: choreography.choreographers.map((entry) => entry.userId),
    });
  }

  const selectedAudience = audienceByItem.get(selectedItemId)!;
  const relevantUserIds = [
    ...new Set([...selectedAudience.participants, ...selectedAudience.choreographers]),
  ];
  if (relevantUserIds.length === 0) {
    return { bands: allAvailableBands(days) };
  }

  const periodWindows = days.map((day) => {
    const date = parseDayKey(day);
    return {
      start: atLocalTime(date, DEFAULT_LOCATION_START_HOUR).getTime(),
      end: atLocalTime(date, DEFAULT_LOCATION_END_HOUR).getTime(),
    };
  });
  const periodStart = new Date(Math.min(...periodWindows.map((window) => window.start)));
  const periodEnd = new Date(Math.max(...periodWindows.map((window) => window.end)));
  const assumedNullEndFloor = new Date(periodStart.getTime() - 60 * 60 * 1000);

  const [unavailability, rehearsals] = await Promise.all([
    prisma.userUnavailability.findMany({
      where: {
        userId: { in: relevantUserIds },
        startsAt: { lt: periodEnd },
        endsAt: { gt: periodStart },
      },
      select: { userId: true, startsAt: true, endsAt: true },
    }),
    prisma.event.findMany({
      where: {
        type: { kind: "REHEARSAL" },
        startsAt: { lt: periodEnd },
        OR: [
          { endsAt: { gt: periodStart } },
          {
            AND: [
              { endsAt: null },
              { startsAt: { gte: assumedNullEndFloor } },
            ],
          },
        ],
      },
      select: {
        startsAt: true,
        endsAt: true,
        group: { select: { members: { select: { userId: true } } } },
        choreography: { select: { members: { select: { userId: true } } } },
      },
    }),
  ]);

  const unavailabilityByUser = new Map<string, IntervalMs[]>();
  for (const entry of unavailability) {
    const blocks = unavailabilityByUser.get(entry.userId) ?? [];
    blocks.push({ start: entry.startsAt.getTime(), end: entry.endsAt.getTime() });
    unavailabilityByUser.set(entry.userId, blocks);
  }

  const fullyUnavailableParticipants = new Set(
    selectedAudience.participants.filter(
      (userId) => !hasFreeTime(unavailabilityByUser.get(userId) ?? [], periodWindows),
    ),
  );
  const consideredParticipants = selectedAudience.participants.filter(
    (userId) => !fullyUnavailableParticipants.has(userId),
  );
  const busyByParticipant = new Map<string, IntervalMs[]>();

  function addBusy(userId: string, interval: IntervalMs) {
    if (!consideredParticipants.includes(userId)) {
      return;
    }
    const blocks = busyByParticipant.get(userId) ?? [];
    blocks.push(interval);
    busyByParticipant.set(userId, blocks);
  }

  for (const rehearsal of rehearsals) {
    const interval = {
      start: rehearsal.startsAt.getTime(),
      end: resolveIntervalEnd(rehearsal.startsAt, rehearsal.endsAt).getTime(),
    };
    for (const member of rehearsal.group?.members ?? rehearsal.choreography?.members ?? []) {
      addBusy(member.userId, interval);
    }
  }

  for (const placement of placements) {
    if (placement.itemId === selectedItemId) {
      continue;
    }
    const start = new Date(placement.startsAt).getTime();
    const end = new Date(placement.endsAt).getTime();
    if (!(end > start)) {
      return { error: "Each rehearsal must end after it starts." };
    }
    for (const userId of audienceByItem.get(placement.itemId)!.participants) {
      addBusy(userId, { start, end });
    }
  }

  const bands: SchedulingAvailabilityBand[] = [];
  for (const window of periodWindows) {
    for (let start = window.start; start < window.end; start += SLOT_MS) {
      const end = Math.min(start + SLOT_MS, window.end);
      const unavailableParticipants = consideredParticipants.filter((userId) =>
        [...(unavailabilityByUser.get(userId) ?? []), ...(busyByParticipant.get(userId) ?? [])]
          .some((block) => intervalsOverlap({ start, end }, block)),
      ).length;
      const unavailableChoreographers = selectedAudience.choreographers.filter((userId) =>
        (unavailabilityByUser.get(userId) ?? [])
          .some((block) => intervalsOverlap({ start, end }, block)),
      ).length;

      bands.push({
        day: toLocalDayKey(new Date(start)),
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(end).toISOString(),
        unavailableParticipants,
        unavailableChoreographers,
        allChoreographersUnavailable:
          selectedAudience.choreographers.length > 0 &&
          unavailableChoreographers === selectedAudience.choreographers.length,
      });
    }
  }

  return { bands };
}

function allAvailableBands(days: string[]): SchedulingAvailabilityBand[] {
  const bands: SchedulingAvailabilityBand[] = [];
  for (const day of days) {
    const date = parseDayKey(day);
    const dayStart = atLocalTime(date, DEFAULT_LOCATION_START_HOUR).getTime();
    const dayEnd = atLocalTime(date, DEFAULT_LOCATION_END_HOUR).getTime();
    for (let start = dayStart; start < dayEnd; start += SLOT_MS) {
      bands.push({
        day,
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(Math.min(start + SLOT_MS, dayEnd)).toISOString(),
        unavailableParticipants: 0,
        unavailableChoreographers: 0,
        allChoreographersUnavailable: false,
      });
    }
  }
  return bands;
}

function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
