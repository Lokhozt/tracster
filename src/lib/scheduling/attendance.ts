import { prisma } from "@/lib/db";
import { computeRehearsalStatistics } from "@/lib/rehearsal-statistics";
import type { RehearsalAttendance } from "@/lib/scheduling/types";

export const EMPTY_ATTENDANCE: RehearsalAttendance = { attended: 0, eligible: 0 };

export function formatParticipantAttendance(
  name: string,
  attendance: RehearsalAttendance,
): string {
  return `${name} (${attendance.attended} / ${attendance.eligible})`;
}

export function attendanceFor(
  loaded: Map<string, Map<string, RehearsalAttendance>>,
  choreographyId: string,
  userId: string,
): RehearsalAttendance {
  return loaded.get(choreographyId)?.get(userId) ?? EMPTY_ATTENDANCE;
}

export async function loadChoreographyAttendance(
  choreographies: Array<{ id: string; memberIds: string[] }>,
): Promise<Map<string, Map<string, RehearsalAttendance>>> {
  const result = new Map<string, Map<string, RehearsalAttendance>>();
  const ids = [...new Set(choreographies.map((entry) => entry.id))];
  if (ids.length === 0) {
    return result;
  }

  const memberIdsByChoreography = new Map<string, string[]>();
  for (const choreography of choreographies) {
    if (!memberIdsByChoreography.has(choreography.id)) {
      memberIdsByChoreography.set(choreography.id, choreography.memberIds);
    }
  }

  const rehearsals = await prisma.event.findMany({
    where: {
      choreographyId: { in: ids },
      type: { kind: "REHEARSAL" },
    },
    select: {
      id: true,
      choreographyId: true,
      startsAt: true,
      endsAt: true,
      groupId: true,
      group: { select: { members: { select: { userId: true } } } },
      availabilities: { select: { userId: true, status: true } },
    },
  });

  const byChoreography = new Map<string, typeof rehearsals>();
  for (const rehearsal of rehearsals) {
    if (!rehearsal.choreographyId) {
      continue;
    }
    const list = byChoreography.get(rehearsal.choreographyId) ?? [];
    list.push(rehearsal);
    byChoreography.set(rehearsal.choreographyId, list);
  }

  for (const id of ids) {
    const stats = computeRehearsalStatistics(
      byChoreography.get(id) ?? [],
      memberIdsByChoreography.get(id) ?? [],
    );
    const byUser = new Map<string, RehearsalAttendance>();
    for (const participant of stats.participants) {
      byUser.set(participant.userId, {
        attended: participant.attendedCount,
        eligible: participant.eligibleCount,
      });
    }
    result.set(id, byUser);
  }

  return result;
}
