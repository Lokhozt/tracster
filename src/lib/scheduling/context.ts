import { prisma } from "@/lib/db";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { atLocalTime, hasFreeTime, parseDayKey, subtractIntervals } from "@/lib/scheduling/intervals";
import type {
  IntervalMs,
  ResolvedLocationWindow,
  ResolvedSchedulingItem,
  SchedulingPerson,
  SchedulingProblem,
  SchedulingRequest,
} from "@/lib/scheduling/types";
import {
  DEFAULT_LOCATION_END_HOUR,
  DEFAULT_LOCATION_START_HOUR,
} from "@/lib/scheduling/types";
import { basicUserSelect, formatUserName } from "@/lib/users";

function toPerson(
  user: { id: string; firstName: string; lastName: string },
  unavailability: Array<{ userId: string; startsAt: Date; endsAt: Date }>,
  periodWindows: Array<{ start: number; end: number }>,
): SchedulingPerson {
  const blocks = unavailability
    .filter((entry) => entry.userId === user.id)
    .map((entry) => ({ start: entry.startsAt.getTime(), end: entry.endsAt.getTime() }));

  return {
    id: user.id,
    name: formatUserName(user),
    unavailability: blocks,
    availableInPeriod: hasFreeTime(blocks, periodWindows),
  };
}

export async function buildSchedulingProblem(
  request: SchedulingRequest,
): Promise<SchedulingProblem | { error: string }> {
  if (request.items.length === 0) {
    return { error: "Add at least one choreography." };
  }

  if (request.days.length === 0) {
    return { error: "Select at least one day." };
  }

  if (request.locationIds.length === 0) {
    return { error: "Select at least one location." };
  }

  const choreographyIds = [...new Set(request.items.map((item) => item.choreographyId))];
  const locations = await prisma.location.findMany({
    where: { id: { in: request.locationIds } },
    select: { id: true, name: true },
  });

  if (locations.length !== request.locationIds.length) {
    return { error: "One of the selected locations was not found." };
  }

  const choreographies = await prisma.choreography.findMany({
    where: { id: { in: choreographyIds }, ...visibleChoreographyWhere },
    select: {
      id: true,
      title: true,
      choreographers: { include: { user: { select: basicUserSelect } } },
      members: { include: { user: { select: basicUserSelect } } },
      groups: {
        select: {
          id: true,
          name: true,
          members: { include: { user: { select: basicUserSelect } } },
        },
      },
    },
  });

  if (choreographies.length !== choreographyIds.length) {
    return { error: "One of the selected choreographies was not found." };
  }

  const choreographyById = new Map(choreographies.map((entry) => [entry.id, entry]));
  const locationById = new Map(locations.map((entry) => [entry.id, entry]));

  const windows: ResolvedLocationWindow[] = [];
  for (const locationId of request.locationIds) {
    const location = locationById.get(locationId);
    if (!location) {
      continue;
    }

    for (const day of request.days) {
      const dayDate = parseDayKey(day);
      const dayWindow = {
        start: atLocalTime(dayDate, DEFAULT_LOCATION_START_HOUR).getTime(),
        end: atLocalTime(dayDate, DEFAULT_LOCATION_END_HOUR).getTime(),
      };
      const blocked: IntervalMs[] = [];
      for (const entry of request.locationUnavailabilities ?? []) {
        if (entry.locationId !== locationId || entry.day !== day) {
          continue;
        }
        const start = new Date(entry.startsAt).getTime();
        const end = new Date(entry.endsAt).getTime();
        if (!(end > start)) {
          return { error: "Each location unavailability must end after it starts." };
        }
        blocked.push({ start, end });
      }

      const freeSlots = subtractIntervals(dayWindow, blocked);
      for (const slot of freeSlots) {
        windows.push({
          locationId: location.id,
          locationName: location.name,
          day,
          start: slot.start,
          end: slot.end,
        });
      }
    }
  }

  if (windows.length === 0) {
    return { error: "Locations are fully unavailable on the selected days." };
  }

  const periodWindows = request.days.map((day) => {
    const dayDate = parseDayKey(day);
    return {
      start: atLocalTime(dayDate, DEFAULT_LOCATION_START_HOUR).getTime(),
      end: atLocalTime(dayDate, DEFAULT_LOCATION_END_HOUR).getTime(),
    };
  });
  const periodStart = Math.min(...periodWindows.map((window) => window.start));
  const periodEnd = Math.max(...periodWindows.map((window) => window.end));

  const allUserIds = new Set<string>();
  for (const choreography of choreographies) {
    for (const entry of choreography.choreographers) {
      allUserIds.add(entry.userId);
    }
    for (const entry of choreography.members) {
      allUserIds.add(entry.userId);
    }
    for (const group of choreography.groups) {
      for (const member of group.members) {
        allUserIds.add(member.userId);
      }
    }
  }

  const unavailability =
    allUserIds.size === 0
      ? []
      : await prisma.userUnavailability.findMany({
          where: {
            userId: { in: [...allUserIds] },
            startsAt: { lt: new Date(periodEnd) },
            endsAt: { gt: new Date(periodStart) },
          },
          select: { userId: true, startsAt: true, endsAt: true },
        });

  const items: ResolvedSchedulingItem[] = [];

  for (const [index, draft] of request.items.entries()) {
    const choreography = choreographyById.get(draft.choreographyId);
    if (!choreography) {
      return { error: "One of the selected choreographies was not found." };
    }

    let groupName: string | null = null;
    let participantUsers = choreography.members.map((member) => member.user);

    if (draft.groupId) {
      const group = choreography.groups.find((entry) => entry.id === draft.groupId);
      if (!group) {
        return { error: "Selected group does not belong to this choreography." };
      }
      groupName = group.name;
      participantUsers = group.members.map((member) => member.user);
    }

    if (draft.durationMinutes < 15) {
      return { error: "Duration must be at least 15 minutes." };
    }

    const allowedLocationIds =
      draft.allowedLocationIds.length > 0 ? draft.allowedLocationIds : null;
    if (allowedLocationIds) {
      for (const locationId of allowedLocationIds) {
        if (!request.locationIds.includes(locationId)) {
          return { error: "A choreography is limited to a location that is not available." };
        }
      }
    }

    const allowedWindows =
      draft.allowedWindows.length > 0
        ? draft.allowedWindows.map((window) => ({
            start: new Date(window.startsAt).getTime(),
            end: new Date(window.endsAt).getTime(),
          }))
        : null;

    if (allowedWindows?.some((window) => window.end <= window.start)) {
      return { error: "Each datetime constraint must end after it starts." };
    }

    items.push({
      id: draft.id,
      index,
      choreographyId: choreography.id,
      choreographyTitle: choreography.title,
      groupId: draft.groupId,
      groupName,
      durationMs: draft.durationMinutes * 60 * 1000,
      allowedLocationIds,
      allowedWindows,
      choreographers: choreography.choreographers.map((entry) =>
        toPerson(entry.user, unavailability, periodWindows),
      ),
      participants: participantUsers.map((user) => toPerson(user, unavailability, periodWindows)),
    });
  }

  return {
    items,
    windows,
    restMs: Math.max(0, request.restMinutes) * 60 * 1000,
  };
}
