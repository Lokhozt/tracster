import type { AvailabilityStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getRehearsalAudienceMemberIds } from "@/lib/groups";
import {
  isPastRehearsal,
  type RehearsalForStatistics,
} from "@/lib/rehearsal-statistics";
import {
  clippedRangeMinutes,
  rehearsalMinutes,
  rehearsalOverlapsRange,
} from "@/lib/stats-period";
import { basicUserSelect, formatUserName, userNameOrderBy } from "@/lib/users";

export type RepresentationChoreographyStats = {
  id: string;
  title: string;
  rehearsalCount: number;
  rehearsalMinutes: number;
  participantCount: number;
};

export type RepresentationParticipantLeaderboardEntry = {
  userId: string;
  name: string;
  choreographyCount: number;
  rehearsalAttendedCount: number;
  rehearsalAttendedMinutes: number;
};

export type RepresentationStats = {
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  choreographyCount: number;
  rehearsalCount: number;
  rehearsalMinutes: number;
  participantCount: number;
  choreographies: RepresentationChoreographyStats[];
  leaderboard: RepresentationParticipantLeaderboardEntry[];
};

export type UserStatsChoreography = {
  id: string;
  title: string;
};

export type UserStats = {
  userId: string;
  from: string;
  to: string;
  representationEventId: string | null;
  representationTitle: string | null;
  choreographyCount: number;
  demonstrationCount: number;
  rehearsalAttended: number;
  rehearsalMissed: number;
  rehearsalMinutesAttended: number;
  unavailabilityMinutes: number;
  choreographies: UserStatsChoreography[];
};

async function loadRepresentationChoreographyIds(
  eventId: string,
): Promise<{ ids: string[]; title: string } | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      type: { select: { kind: true } },
      choreographies: {
        where: { choreography: { archivedAt: null } },
        select: { choreographyId: true },
      },
    },
  });

  if (!event || event.type.kind !== "REPRESENTATION") {
    return null;
  }

  return {
    ids: event.choreographies.map((link) => link.choreographyId),
    title: event.title,
  };
}

const rehearsalSelect = {
  id: true,
  choreographyId: true,
  startsAt: true,
  endsAt: true,
  groupId: true,
  group: {
    select: {
      members: { select: { userId: true } },
    },
  },
  availabilities: {
    select: { userId: true, status: true },
  },
} as const;

function sumRehearsalMinutes(
  rehearsals: { startsAt: Date; endsAt: Date | null }[],
): number {
  return rehearsals.reduce((total, rehearsal) => total + rehearsalMinutes(rehearsal), 0);
}

export async function loadRepresentationStats(eventId: string): Promise<RepresentationStats | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      type: { select: { kind: true } },
      choreographies: {
        where: { choreography: { archivedAt: null } },
        select: {
          choreography: {
            select: {
              id: true,
              title: true,
              members: { select: { userId: true } },
            },
          },
        },
        orderBy: { choreography: { title: "asc" } },
      },
    },
  });

  if (!event || event.type.kind !== "REPRESENTATION") {
    return null;
  }

  const choreographies = event.choreographies.map((link) => link.choreography);
  const choreographyIds = choreographies.map((choreography) => choreography.id);

  const rehearsals =
    choreographyIds.length === 0
      ? []
      : await prisma.event.findMany({
          where: {
            choreographyId: { in: choreographyIds },
            type: { kind: "REHEARSAL" },
          },
          select: rehearsalSelect,
        });

  const rehearsalsByChoreography = new Map<string, typeof rehearsals>();
  for (const rehearsal of rehearsals) {
    if (!rehearsal.choreographyId) {
      continue;
    }
    const list = rehearsalsByChoreography.get(rehearsal.choreographyId) ?? [];
    list.push(rehearsal);
    rehearsalsByChoreography.set(rehearsal.choreographyId, list);
  }

  const participantIds = new Set<string>();
  for (const choreography of choreographies) {
    for (const member of choreography.members) {
      participantIds.add(member.userId);
    }
  }

  const choreographyStats: RepresentationChoreographyStats[] = choreographies.map((choreography) => {
    const items = rehearsalsByChoreography.get(choreography.id) ?? [];
    return {
      id: choreography.id,
      title: choreography.title,
      rehearsalCount: items.length,
      rehearsalMinutes: sumRehearsalMinutes(items),
      participantCount: choreography.members.length,
    };
  });

  const memberIdsByChoreography = new Map<string, string[]>();
  const choreographyCountByUser = new Map<string, number>();
  for (const choreography of choreographies) {
    const memberIds = choreography.members.map((member) => member.userId);
    memberIdsByChoreography.set(choreography.id, memberIds);
    for (const member of choreography.members) {
      choreographyCountByUser.set(
        member.userId,
        (choreographyCountByUser.get(member.userId) ?? 0) + 1,
      );
    }
  }

  const rehearsalAttendedCountByUser = new Map<string, number>();
  const rehearsalAttendedMinutesByUser = new Map<string, number>();
  for (const rehearsal of rehearsals) {
    if (!rehearsal.choreographyId || !isPastRehearsal(rehearsal)) {
      continue;
    }
    const memberIds = memberIdsByChoreography.get(rehearsal.choreographyId) ?? [];
    const rehearsalForStats: RehearsalForStatistics = {
      id: rehearsal.id,
      startsAt: rehearsal.startsAt,
      endsAt: rehearsal.endsAt,
      groupId: rehearsal.groupId,
      group: rehearsal.group,
      availabilities: rehearsal.availabilities,
    };
    const minutes = rehearsalMinutes(rehearsal);
    for (const audienceUserId of getRehearsalAudienceMemberIds(rehearsal, memberIds)) {
      if (!userAttendedRehearsal(rehearsalForStats, audienceUserId, memberIds)) {
        continue;
      }
      rehearsalAttendedCountByUser.set(
        audienceUserId,
        (rehearsalAttendedCountByUser.get(audienceUserId) ?? 0) + 1,
      );
      rehearsalAttendedMinutesByUser.set(
        audienceUserId,
        (rehearsalAttendedMinutesByUser.get(audienceUserId) ?? 0) + minutes,
      );
    }
  }

  const leaderboardUsers =
    participantIds.size === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: [...participantIds] } },
          select: basicUserSelect,
          orderBy: userNameOrderBy,
        });

  const leaderboard: RepresentationParticipantLeaderboardEntry[] = leaderboardUsers
    .map((user) => ({
      userId: user.id,
      name: formatUserName(user),
      choreographyCount: choreographyCountByUser.get(user.id) ?? 0,
      rehearsalAttendedCount: rehearsalAttendedCountByUser.get(user.id) ?? 0,
      rehearsalAttendedMinutes: rehearsalAttendedMinutesByUser.get(user.id) ?? 0,
    }))
    .sort((left, right) => {
      if (right.rehearsalAttendedMinutes !== left.rehearsalAttendedMinutes) {
        return right.rehearsalAttendedMinutes - left.rehearsalAttendedMinutes;
      }
      if (right.rehearsalAttendedCount !== left.rehearsalAttendedCount) {
        return right.rehearsalAttendedCount - left.rehearsalAttendedCount;
      }
      return left.name.localeCompare(right.name);
    });

  return {
    eventId: event.id,
    eventTitle: event.title,
    eventStartsAt: event.startsAt.toISOString(),
    choreographyCount: choreographies.length,
    rehearsalCount: rehearsals.length,
    rehearsalMinutes: sumRehearsalMinutes(rehearsals),
    participantCount: participantIds.size,
    choreographies: choreographyStats,
    leaderboard,
  };
}

function userAttendedRehearsal(
  rehearsal: RehearsalForStatistics,
  userId: string,
  memberIds: string[],
): boolean {
  const audience = new Set(getRehearsalAudienceMemberIds(rehearsal, memberIds));
  if (!audience.has(userId)) {
    return false;
  }
  const response = rehearsal.availabilities.find((item) => item.userId === userId);
  return response?.status === "AVAILABLE";
}

function userEligiblePastRehearsal(
  rehearsal: RehearsalForStatistics,
  userId: string,
  memberIds: string[],
): boolean {
  const audience = new Set(getRehearsalAudienceMemberIds(rehearsal, memberIds));
  return audience.has(userId);
}

export async function loadUserStats(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
  representationEventId?: string | null,
): Promise<UserStats | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return null;
  }

  let representationTitle: string | null = null;
  let representationChoreographyIds: string[] | null = null;
  if (representationEventId) {
    const representation = await loadRepresentationChoreographyIds(representationEventId);
    if (!representation) {
      return null;
    }
    representationTitle = representation.title;
    representationChoreographyIds = representation.ids;
  }

  const memberships = await prisma.choreographyMember.findMany({
    where: {
      userId,
      choreography: { archivedAt: null },
      ...(representationChoreographyIds
        ? { choreographyId: { in: representationChoreographyIds } }
        : {}),
    },
    select: {
      choreography: {
        select: { id: true, title: true },
      },
    },
    orderBy: { choreography: { title: "asc" } },
  });

  const choreographyIds = memberships.map((membership) => membership.choreography.id);

  const [rehearsals, demonstrationCount, unavailability] = await Promise.all([
    choreographyIds.length === 0
      ? Promise.resolve([])
      : prisma.event.findMany({
          where: {
            choreographyId: { in: choreographyIds },
            type: { kind: "REHEARSAL" },
          },
          select: rehearsalSelect,
        }),
    prisma.event.count({
      where: {
        type: { kind: "DEMONSTRATION" },
        startsAt: { gte: rangeStart, lt: rangeEnd },
        participants: { some: { userId } },
        ...(representationChoreographyIds
          ? {
              choreographies: {
                some: { choreographyId: { in: representationChoreographyIds } },
              },
            }
          : {}),
      },
    }),
    prisma.userUnavailability.findMany({
      where: {
        userId,
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const membersByChoreography = await prisma.choreographyMember.findMany({
    where: { choreographyId: { in: choreographyIds } },
    select: { choreographyId: true, userId: true },
  });
  const memberIdsByChoreography = new Map<string, string[]>();
  for (const member of membersByChoreography) {
    const list = memberIdsByChoreography.get(member.choreographyId) ?? [];
    list.push(member.userId);
    memberIdsByChoreography.set(member.choreographyId, list);
  }

  let rehearsalAttended = 0;
  let rehearsalMissed = 0;
  let rehearsalMinutesAttended = 0;

  for (const rehearsal of rehearsals) {
    if (!rehearsal.choreographyId) {
      continue;
    }
    if (!rehearsalOverlapsRange(rehearsal, rangeStart, rangeEnd)) {
      continue;
    }
    if (!isPastRehearsal(rehearsal)) {
      continue;
    }

    const memberIds = memberIdsByChoreography.get(rehearsal.choreographyId) ?? [];
    const rehearsalForStats: RehearsalForStatistics = {
      id: rehearsal.id,
      startsAt: rehearsal.startsAt,
      endsAt: rehearsal.endsAt,
      groupId: rehearsal.groupId,
      group: rehearsal.group,
      availabilities: rehearsal.availabilities as {
        userId: string;
        status: AvailabilityStatus;
      }[],
    };

    if (!userEligiblePastRehearsal(rehearsalForStats, userId, memberIds)) {
      continue;
    }

    if (userAttendedRehearsal(rehearsalForStats, userId, memberIds)) {
      rehearsalAttended += 1;
      rehearsalMinutesAttended += rehearsalMinutes(rehearsal);
    } else {
      rehearsalMissed += 1;
    }
  }

  const unavailabilityMinutes = unavailability.reduce(
    (total, entry) =>
      total + clippedRangeMinutes(entry.startsAt, entry.endsAt, rangeStart, rangeEnd),
    0,
  );

  return {
    userId,
    from: rangeStart.toISOString(),
    to: rangeEnd.toISOString(),
    representationEventId: representationEventId ?? null,
    representationTitle,
    choreographyCount: memberships.length,
    demonstrationCount,
    rehearsalAttended,
    rehearsalMissed,
    rehearsalMinutesAttended,
    unavailabilityMinutes,
    choreographies: memberships.map((membership) => ({
      id: membership.choreography.id,
      title: membership.choreography.title,
    })),
  };
}
