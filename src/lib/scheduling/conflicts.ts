import { prisma } from "@/lib/db";
import { intervalsOverlap, resolveIntervalEnd } from "@/lib/conflicts";
import type {
  SchedulingPlacementConflict,
  SchedulingPlacementConflicts,
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
};

export async function findSchedulingPlacementConflicts(
  placements: PlacementInput[],
): Promise<{ conflicts: SchedulingPlacementConflicts } | { error: string }> {
  const choreographyIds = [...new Set(placements.map((placement) => placement.choreographyId))];
  const choreographies = await prisma.choreography.findMany({
    where: { id: { in: choreographyIds } },
    select: {
      id: true,
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
  const intervalByItem = new Map<string, { start: Date; end: Date }>();
  const allAudienceIds = new Set<string>();
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
    audienceByItem.set(placement.itemId, members);
    for (const member of members) {
      allAudienceIds.add(member.id);
      namesById.set(member.id, formatUserName(member));
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
      { unavailable: new Set<string>(), engaged: new Set<string>() },
    ]),
  );
  if (allAudienceIds.size === 0) {
    return { conflicts: serializeConflicts(mutable) };
  }

  const overallStart = new Date(
    Math.min(...[...intervalByItem.values()].map((interval) => interval.start.getTime())),
  );
  const overallEnd = new Date(
    Math.max(...[...intervalByItem.values()].map((interval) => interval.end.getTime())),
  );
  const assumedNullEndFloor = new Date(overallStart.getTime() - 60 * 60 * 1000);

  const [unavailability, rehearsals] = await Promise.all([
    prisma.userUnavailability.findMany({
      where: {
        userId: { in: [...allAudienceIds] },
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

  for (const entry of unavailability) {
    namesById.set(entry.userId, formatUserName(entry.user));
    for (const placement of placements) {
      const interval = intervalByItem.get(placement.itemId)!;
      const audience = audienceByItem.get(placement.itemId)!;
      if (
        audience.some((member) => member.id === entry.userId) &&
        intervalsOverlap(interval.start, interval.end, entry.startsAt, entry.endsAt)
      ) {
        mutable.get(placement.itemId)!.unavailable.add(entry.userId);
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
        if (memberIds.has(member.id)) {
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
        if (currentAudience.has(member.id)) {
          mutable.get(current.itemId)!.engaged.add(member.id);
          mutable.get(other.itemId)!.engaged.add(member.id);
        }
      }
    }
  }

  return { conflicts: serializeConflicts(mutable, namesById) };
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
      },
    ]),
  );
}
