import { prisma } from "@/lib/db";
import { intervalsOverlap, resolveIntervalEnd } from "@/lib/conflicts";
import { atLocalTime, hasFreeTime, parseDayKey } from "@/lib/scheduling/intervals";
import type {
  IntervalMs,
  SchedulingConflictsResult,
  SchedulingPlacementConflict,
  SchedulingPlacementConflicts,
} from "@/lib/scheduling/types";
import {
  DEFAULT_LOCATION_END_HOUR,
  DEFAULT_LOCATION_START_HOUR,
} from "@/lib/scheduling/types";
import { basicUserSelect, formatUserName } from "@/lib/users";

type PlacementInput = {
  itemId: string;
  choreographyId: string;
  groupId?: string | null;
  startsAt: string;
  endsAt: string;
};

type AudienceMember = {
  id: string;
  firstName: string;
  lastName: string;
};

type MutableConflict = {
  unavailable: Set<string>;
  engaged: Set<string>;
  choreographerUnavailable: Set<string>;
};

export async function findSchedulingPlacementConflicts(
  placements: PlacementInput[],
  days: string[],
): Promise<SchedulingConflictsResult | { error: string }> {
  const choreographyIds = [...new Set(placements.map((placement) => placement.choreographyId))];
  const choreographies = await prisma.choreography.findMany({
    where: { id: { in: choreographyIds } },
    select: {
      id: true,
      choreographers: { select: { user: { select: basicUserSelect } } },
      members: { select: { user: { select: basicUserSelect } } },
      groups: {
        select: {
          id: true,
          members: { select: { user: { select: basicUserSelect } } },
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
  const audienceByItem = new Map<string, AudienceMember[]>();
  const choreographersByItem = new Map<string, AudienceMember[]>();
  const intervalByItem = new Map<string, { start: Date; end: Date }>();
  const allUserIds = new Set<string>();
  const namesById = new Map<string, string>();

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

    const members = (group?.members ?? choreography.members).map((entry) => entry.user);
    const choreographers = choreography.choreographers.map((entry) => entry.user);
    audienceByItem.set(placement.itemId, members);
    choreographersByItem.set(placement.itemId, choreographers);
    for (const person of [...members, ...choreographers]) {
      allUserIds.add(person.id);
      namesById.set(person.id, formatUserName(person));
    }

    const start = new Date(placement.startsAt);
    const end = new Date(placement.endsAt);
    if (end <= start) {
      return { error: "Each rehearsal must end after it starts." };
    }
    intervalByItem.set(placement.itemId, { start, end });
  }

  const mutable = new Map<string, MutableConflict>(
    placements.map((placement) => [
      placement.itemId,
      {
        unavailable: new Set<string>(),
        engaged: new Set<string>(),
        choreographerUnavailable: new Set<string>(),
      },
    ]),
  );
  if (allUserIds.size === 0) {
    return { conflicts: serializeConflicts(mutable), unavailableAllPeriod: [] };
  }

  const periodWindows: IntervalMs[] = days.map((day) => {
    const dayDate = parseDayKey(day);
    return {
      start: atLocalTime(dayDate, DEFAULT_LOCATION_START_HOUR).getTime(),
      end: atLocalTime(dayDate, DEFAULT_LOCATION_END_HOUR).getTime(),
    };
  });
  const periodStart = new Date(Math.min(...periodWindows.map((window) => window.start)));
  const periodEnd = new Date(Math.max(...periodWindows.map((window) => window.end)));
  const overallStart = new Date(
    Math.min(
      periodStart.getTime(),
      ...[...intervalByItem.values()].map((interval) => interval.start.getTime()),
    ),
  );
  const overallEnd = new Date(
    Math.max(
      periodEnd.getTime(),
      ...[...intervalByItem.values()].map((interval) => interval.end.getTime()),
    ),
  );
  const assumedNullEndFloor = new Date(overallStart.getTime() - 60 * 60 * 1000);

  const [unavailability, rehearsals] = await Promise.all([
    prisma.userUnavailability.findMany({
      where: {
        userId: { in: [...allUserIds] },
        startsAt: { lt: overallEnd },
        endsAt: { gt: overallStart },
      },
      select: {
        userId: true,
        startsAt: true,
        endsAt: true,
        user: { select: basicUserSelect },
      },
    }),
    prisma.event.findMany({
      where: {
        type: { kind: "REHEARSAL" },
        startsAt: { lt: overallEnd },
        OR: [
          { endsAt: { gt: overallStart } },
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
        group: {
          select: {
            members: { select: { user: { select: basicUserSelect } } },
          },
        },
        choreography: {
          select: {
            members: { select: { user: { select: basicUserSelect } } },
          },
        },
      },
    }),
  ]);

  const fullyUnavailableParticipantIds = new Set<string>();
  const participantIds = new Set<string>();
  for (const members of audienceByItem.values()) {
    for (const member of members) {
      participantIds.add(member.id);
    }
  }
  for (const participantId of participantIds) {
    const blocks = unavailability
      .filter((entry) => entry.userId === participantId)
      .map((entry) => ({ start: entry.startsAt.getTime(), end: entry.endsAt.getTime() }));
    if (!hasFreeTime(blocks, periodWindows)) {
      fullyUnavailableParticipantIds.add(participantId);
    }
  }

  for (const entry of unavailability) {
    namesById.set(entry.userId, formatUserName(entry.user));
    for (const placement of placements) {
      const interval = intervalByItem.get(placement.itemId)!;
      const audience = audienceByItem.get(placement.itemId)!;
      if (!intervalsOverlap(interval.start, interval.end, entry.startsAt, entry.endsAt)) {
        continue;
      }
      if (audience.some((member) => member.id === entry.userId)) {
        if (!fullyUnavailableParticipantIds.has(entry.userId)) {
          mutable.get(placement.itemId)!.unavailable.add(entry.userId);
        }
      }
      if (choreographersByItem.get(placement.itemId)!.some((person) => person.id === entry.userId)) {
        mutable.get(placement.itemId)!.choreographerUnavailable.add(entry.userId);
      }
    }
  }

  for (const rehearsal of rehearsals) {
    const members = (rehearsal.group?.members ?? rehearsal.choreography?.members ?? [])
      .map((entry) => entry.user);
    const memberIds = new Set(members.map((member) => member.id));
    for (const member of members) {
      namesById.set(member.id, formatUserName(member));
    }
    const rehearsalEnd = resolveIntervalEnd(rehearsal.startsAt, rehearsal.endsAt);

    for (const placement of placements) {
      const interval = intervalByItem.get(placement.itemId)!;
      if (!intervalsOverlap(interval.start, interval.end, rehearsal.startsAt, rehearsalEnd)) {
        continue;
      }
      for (const member of audienceByItem.get(placement.itemId)!) {
        if (memberIds.has(member.id) && !fullyUnavailableParticipantIds.has(member.id)) {
          mutable.get(placement.itemId)!.engaged.add(member.id);
        }
      }
    }
  }

  for (let index = 0; index < placements.length; index += 1) {
    const current = placements[index];
    const currentInterval = intervalByItem.get(current.itemId)!;
    const currentAudience = new Set(
      audienceByItem.get(current.itemId)!.map((member) => member.id),
    );

    for (let otherIndex = index + 1; otherIndex < placements.length; otherIndex += 1) {
      const other = placements[otherIndex];
      const otherInterval = intervalByItem.get(other.itemId)!;
      if (
        !intervalsOverlap(
          currentInterval.start,
          currentInterval.end,
          otherInterval.start,
          otherInterval.end,
        )
      ) {
        continue;
      }

      for (const member of audienceByItem.get(other.itemId)!) {
        if (currentAudience.has(member.id) && !fullyUnavailableParticipantIds.has(member.id)) {
          mutable.get(current.itemId)!.engaged.add(member.id);
          mutable.get(other.itemId)!.engaged.add(member.id);
        }
      }
    }
  }

  return {
    conflicts: serializeConflicts(mutable, namesById),
    unavailableAllPeriod: [...fullyUnavailableParticipantIds]
      .map((id) => namesById.get(id) ?? id)
      .sort((a, b) => a.localeCompare(b)),
  };
}

function serializeConflicts(
  conflicts: Map<string, MutableConflict>,
  namesById = new Map<string, string>(),
): SchedulingPlacementConflicts {
  return Object.fromEntries(
    [...conflicts].map(([itemId, conflict]): [string, SchedulingPlacementConflict] => [
      itemId,
      {
        unavailable: [...conflict.unavailable]
          .map((id) => namesById.get(id) ?? id)
          .sort((a, b) => a.localeCompare(b)),
        engaged: [...conflict.engaged]
          .map((id) => namesById.get(id) ?? id)
          .sort((a, b) => a.localeCompare(b)),
        choreographerUnavailable: [...conflict.choreographerUnavailable]
          .map((id) => namesById.get(id) ?? id)
          .sort((a, b) => a.localeCompare(b)),
      },
    ]),
  );
}
