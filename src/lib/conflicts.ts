import { prisma } from "@/lib/db";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { eventKindAllowsChoreographyLinks } from "@/lib/event-type-helpers";
import { getGroupForChoreography } from "@/lib/groups";
import { basicUserSelect, formatUserName } from "@/lib/users";

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export type ConflictParticipant = {
  id: string;
  name: string;
};

export type ParticipantConflicts = {
  unavailable: ConflictParticipant[];
  engaged: ConflictParticipant[];
};

export function resolveIntervalEnd(startsAt: Date, endsAt: Date | null): Date {
  if (endsAt && endsAt > startsAt) {
    return endsAt;
  }

  return new Date(startsAt.getTime() + DEFAULT_DURATION_MS);
}

export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && startB < endA;
}

function uniqueParticipants(
  users: Array<{ id: string; firstName: string; lastName: string }>,
): ConflictParticipant[] {
  const byId = new Map<string, ConflictParticipant>();

  for (const user of users) {
    if (!byId.has(user.id)) {
      byId.set(user.id, { id: user.id, name: formatUserName(user) });
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function getAudienceUserIds(
  choreographyId: string,
  groupId?: string,
): Promise<string[] | { error: string }> {
  if (groupId) {
    const group = await getGroupForChoreography(choreographyId, groupId);
    if (!group) {
      return { error: "Selected group does not belong to this choreography." };
    }

    return group.members.map((member) => member.userId);
  }

  const members = await prisma.choreographyMember.findMany({
    where: { choreographyId },
    select: { userId: true },
  });

  return members.map((member) => member.userId);
}

function overlappingTimeFilter(rangeStart: Date, rangeEnd: Date) {
  const assumedNullEndFloor = new Date(rangeStart.getTime() - DEFAULT_DURATION_MS);

  return {
    startsAt: { lt: rangeEnd },
    OR: [
      { endsAt: { gt: rangeStart } },
      {
        AND: [{ endsAt: null }, { startsAt: { gte: assumedNullEndFloor } }],
      },
    ],
  };
}

export async function findParticipantConflicts(options: {
  choreographyId: string;
  startsAt: Date;
  endsAt: Date | null;
  groupId?: string;
}): Promise<ParticipantConflicts | { error: string }> {
  const audience = await getAudienceUserIds(options.choreographyId, options.groupId);
  if (!Array.isArray(audience)) {
    return audience;
  }

  if (audience.length === 0) {
    return { unavailable: [], engaged: [] };
  }

  const rangeStart = options.startsAt;
  const rangeEnd = resolveIntervalEnd(options.startsAt, options.endsAt);
  const timeFilter = overlappingTimeFilter(rangeStart, rangeEnd);
  const audienceFilter = { in: audience };

  const [unavailability, events] = await Promise.all([
    prisma.userUnavailability.findMany({
      where: {
        userId: audienceFilter,
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { user: { select: basicUserSelect } },
    }),
    prisma.event.findMany({
      where: {
        ...timeFilter,
        OR: [
          { type: { kind: { not: "REHEARSAL" } } },
          { choreography: visibleChoreographyWhere },
          { choreographyId: null },
        ],
      },
      select: {
        startsAt: true,
        endsAt: true,
        choreographyId: true,
        groupId: true,
        type: { select: { kind: true } },
        group: { select: { members: { select: { userId: true } } } },
        choreography: {
          select: { members: { select: { userId: true } } },
        },
        participants: { select: { userId: true } },
        choreographies: {
          where: { choreography: visibleChoreographyWhere },
          select: {
            choreography: {
              select: { members: { select: { userId: true } } },
            },
          },
        },
      },
    }),
  ]);

  const engagedIds = new Set<string>();

  for (const event of events) {
    if (
      !intervalsOverlap(
        rangeStart,
        rangeEnd,
        event.startsAt,
        resolveIntervalEnd(event.startsAt, event.endsAt),
      )
    ) {
      continue;
    }

    if (event.type.kind === "REHEARSAL") {
      const memberIds = event.group
        ? event.group.members.map((member) => member.userId)
        : (event.choreography?.members.map((member) => member.userId) ?? []);

      for (const userId of memberIds) {
        if (audience.includes(userId)) {
          engagedIds.add(userId);
        }
      }
      continue;
    }

    if (eventKindAllowsChoreographyLinks(event.type.kind)) {
      for (const link of event.choreographies) {
        for (const member of link.choreography.members) {
          if (audience.includes(member.userId)) {
            engagedIds.add(member.userId);
          }
        }
      }
      if (event.type.kind === "REPRESENTATION") {
        continue;
      }
    }

    for (const participant of event.participants) {
      if (audience.includes(participant.userId)) {
        engagedIds.add(participant.userId);
      }
    }
  }

  const engagedUsers =
    engagedIds.size === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: [...engagedIds] } },
          select: basicUserSelect,
        });

  return {
    unavailable: uniqueParticipants(unavailability.map((entry) => entry.user)),
    engaged: uniqueParticipants(engagedUsers),
  };
}
