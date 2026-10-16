import { addDays, eachDayOfInterval, format } from "date-fns";
import { prisma } from "@/lib/db";
import { listedLocationInclude } from "@/lib/locations";
import { parseDayKey, startOfLocalDay } from "@/lib/scheduling/intervals";
import type { SchedulePlacement } from "@/lib/scheduling/types";
import { basicUserSelect, formatUserName } from "@/lib/users";

const MAX_PLANNING_DAYS = 14;
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

function sortedUniqueNames(users: Array<{ id: string; firstName: string; lastName: string }>) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const user of users) {
    if (seen.has(user.id)) {
      continue;
    }
    seen.add(user.id);
    names.push(formatUserName(user));
  }
  return names.sort((a, b) => a.localeCompare(b));
}

export function planningDayKeys(startDate: string, endDate: string): string[] {
  const start = parseDayKey(startDate);
  const end = parseDayKey(endDate);
  if (end < start) {
    return [];
  }
  return eachDayOfInterval({ start, end }).map((day) => format(day, "yyyy-MM-dd"));
}

export async function loadPlanningRehearsalPlacements(
  startDate: string,
  endDate: string,
): Promise<
  | {
      placements: SchedulePlacement[];
      days: string[];
      skippedMissingLocation: number;
    }
  | { error: string }
> {
  const days = planningDayKeys(startDate, endDate);
  if (days.length === 0) {
    return { error: "The end date must be on or after the start date." };
  }
  if (days.length > MAX_PLANNING_DAYS) {
    return { error: "The selected period cannot exceed 14 days." };
  }

  const rangeStart = startOfLocalDay(parseDayKey(startDate));
  const rangeEnd = addDays(startOfLocalDay(parseDayKey(endDate)), 1);
  const assumedNullEndFloor = new Date(rangeStart.getTime() - DEFAULT_DURATION_MS);

  const rehearsals = await prisma.event.findMany({
    where: {
      type: { kind: "REHEARSAL" },
      startsAt: { lt: rangeEnd },
      OR: [
        { endsAt: { gt: rangeStart } },
        {
          AND: [{ endsAt: null }, { startsAt: { gte: assumedNullEndFloor } }],
        },
      ],
    },
    include: {
      ...listedLocationInclude,
      choreography: {
        select: {
          id: true,
          title: true,
          choreographers: { select: { user: { select: basicUserSelect } } },
          members: { select: { user: { select: basicUserSelect } } },
        },
      },
      group: {
        select: {
          id: true,
          name: true,
          members: { select: { user: { select: basicUserSelect } } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const placements: SchedulePlacement[] = [];
  let skippedMissingLocation = 0;

  for (const event of rehearsals) {
    if (!event.choreography || !event.locationId || !event.listedLocation) {
      skippedMissingLocation += 1;
      continue;
    }

    const participants = event.group?.members ?? event.choreography.members;
    const choreographers = event.choreography.choreographers.map((entry) => entry.user);
    const participantUsers = participants.map((entry) => entry.user);
    const endsAt =
      event.endsAt?.toISOString() ??
      new Date(event.startsAt.getTime() + DEFAULT_DURATION_MS).toISOString();

    placements.push({
      itemId: event.id,
      choreographyId: event.choreography.id,
      choreographyTitle: event.choreography.title,
      groupId: event.groupId,
      groupName: event.group?.name ?? null,
      locationId: event.locationId,
      locationName: event.listedLocation.name,
      startsAt: event.startsAt.toISOString(),
      endsAt,
      choreographerNames: sortedUniqueNames(choreographers),
      choreographerIds: choreographers.map((user) => user.id),
      participantNames: sortedUniqueNames(participantUsers),
      participantIds: participantUsers.map((user) => user.id),
    });
  }

  return { placements, days, skippedMissingLocation };
}
