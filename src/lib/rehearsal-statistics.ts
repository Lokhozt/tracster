import { differenceInMinutes } from "date-fns";
import type { AvailabilityStatus } from "@/generated/prisma/client";
import { resolveIntervalEnd } from "@/lib/conflicts";
import { getRehearsalAudienceMemberIds } from "@/lib/groups";

export type RehearsalForStatistics = {
  id: string;
  startsAt: Date;
  endsAt: Date | null;
  groupId: string | null;
  group: { members: { userId: string }[] } | null;
  availabilities: { userId: string; status: AvailabilityStatus }[];
};

export type ParticipantRehearsalStats = {
  userId: string;
  attendedCount: number;
  eligibleCount: number;
};

export type RehearsalStatisticsSummary = {
  rehearsalCount: number;
  totalMinutes: number;
  participants: ParticipantRehearsalStats[];
};

export function isPastRehearsal(
  rehearsal: Pick<RehearsalForStatistics, "startsAt" | "endsAt">,
  now: Date = new Date(),
): boolean {
  return resolveIntervalEnd(rehearsal.startsAt, rehearsal.endsAt) <= now;
}

export function computeRehearsalStatistics(
  rehearsals: RehearsalForStatistics[],
  memberIds: string[],
  now: Date = new Date(),
): RehearsalStatisticsSummary {
  const passedRehearsals = rehearsals.filter((rehearsal) => isPastRehearsal(rehearsal, now));

  let totalMinutes = 0;
  for (const rehearsal of passedRehearsals) {
    const end = resolveIntervalEnd(rehearsal.startsAt, rehearsal.endsAt);
    totalMinutes += Math.max(0, differenceInMinutes(end, rehearsal.startsAt));
  }

  const participants = memberIds.map((userId) => {
    let attendedCount = 0;
    let eligibleCount = 0;

    for (const rehearsal of passedRehearsals) {
      const audience = new Set(getRehearsalAudienceMemberIds(rehearsal, memberIds));
      if (!audience.has(userId)) {
        continue;
      }
      eligibleCount += 1;
      const response = rehearsal.availabilities.find((item) => item.userId === userId);
      if (response?.status === "AVAILABLE") {
        attendedCount += 1;
      }
    }

    return { userId, attendedCount, eligibleCount };
  });

  return {
    rehearsalCount: passedRehearsals.length,
    totalMinutes,
    participants: participants.filter((participant) => participant.eligibleCount > 0),
  };
}

export function formatRehearsalDurationMinutes(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

export function attendanceRate(attended: number, eligible: number): number {
  if (eligible <= 0) {
    return 0;
  }
  return Math.round((attended / eligible) * 100);
}
