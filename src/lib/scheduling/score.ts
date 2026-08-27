import {
  atLocalTime,
  intervalsOverlap,
  localDayKey,
  overlapsAny,
  parseDayKey,
} from "@/lib/scheduling/intervals";
import type {
  IntervalMs,
  ResolvedSchedulingItem,
  ScheduleCaveat,
  SchedulingPerson,
  SchedulingProblem,
} from "@/lib/scheduling/types";

export type InternalPlacement = {
  itemIndex: number;
  locationId: string;
  start: number;
  end: number;
};

const CONSTRAINT_PENALTY = 100;
const CHOREOGRAPHER_UNAVAILABLE = 50;
const PARTICIPANT_UNAVAILABLE = 10;
const HOLE_PENALTY = 5;
const CONSECUTIVE_BONUS = 2;
const LONG_STREAK_PENALTY = 5;
const LUNCH_PENALTY = 20;
const BEFORE_NINE_PENALTY = 1;
const BEFORE_TEN_PENALTY = 1;
const AFTER_TWENTY_PENALTY = 2;
const MIDDAY_OVERLAP_PENALTY = 2;

function lunchWindow(day: Date): IntervalMs {
  return {
    start: atLocalTime(day, 12).getTime(),
    end: atLocalTime(day, 14).getTime(),
  };
}

function middayBreakWindow(day: Date): IntervalMs {
  return {
    start: atLocalTime(day, 12, 30).getTime(),
    end: atLocalTime(day, 14).getTime(),
  };
}

function personBusy(person: SchedulingPerson, interval: IntervalMs): boolean {
  return person.availableInPeriod && overlapsAny(interval, person.unavailability);
}

function constraintRespected(item: ResolvedSchedulingItem, placement: InternalPlacement): boolean {
  if (item.allowedLocationIds && !item.allowedLocationIds.includes(placement.locationId)) {
    return false;
  }

  if (item.allowedWindows && item.allowedWindows.length > 0) {
    return item.allowedWindows.some(
      (window) => placement.start >= window.start && placement.end <= window.end,
    );
  }

  return true;
}

function participantSessions(
  placements: InternalPlacement[],
  items: ResolvedSchedulingItem[],
  userId: string,
): InternalPlacement[] {
  return placements
    .filter((placement) =>
      items[placement.itemIndex].participants.some((person) => person.id === userId),
    )
    .sort((a, b) => a.start - b.start);
}

function uniqueParticipants(items: ResolvedSchedulingItem[]): SchedulingPerson[] {
  const byId = new Map<string, SchedulingPerson>();
  for (const item of items) {
    for (const person of item.participants) {
      if (!byId.has(person.id)) {
        byId.set(person.id, person);
      }
    }
  }
  return [...byId.values()];
}

export function scoreSchedule(
  placements: InternalPlacement[],
  problem: SchedulingProblem,
): { score: number; caveats: ScheduleCaveat[] } {
  let score = 0;
  const caveats: ScheduleCaveat[] = [];
  const { items, restMs } = problem;

  for (const placement of placements) {
    const item = items[placement.itemIndex];
    const interval = { start: placement.start, end: placement.end };

    if (!constraintRespected(item, placement)) {
      score -= CONSTRAINT_PENALTY;
      caveats.push({
        kind: "constraint",
        message: `${item.choreographyTitle}${item.groupName ? ` (${item.groupName})` : ""} breaks a location or time constraint.`,
      });
    }

    const startDate = new Date(placement.start);
    if (startDate.getHours() < 9) {
      score -= BEFORE_NINE_PENALTY;
    }
    if (startDate.getHours() < 10) {
      score -= BEFORE_TEN_PENALTY;
    }

    const endDate = new Date(placement.end);
    if (endDate.getHours() > 20 || (endDate.getHours() === 20 && endDate.getMinutes() > 0)) {
      score -= AFTER_TWENTY_PENALTY;
    }

    if (intervalsOverlap(interval, middayBreakWindow(new Date(placement.start)))) {
      score -= MIDDAY_OVERLAP_PENALTY;
    }

    for (const choreographer of item.choreographers) {
      if (personBusy(choreographer, interval)) {
        score -= CHOREOGRAPHER_UNAVAILABLE;
        caveats.push({
          kind: "choreographer_unavailable",
          message: `${choreographer.name} (choreographer) is unavailable for ${item.choreographyTitle}.`,
          userId: choreographer.id,
          userName: choreographer.name,
        });
      }
    }

    for (const participant of item.participants) {
      if (personBusy(participant, interval)) {
        score -= PARTICIPANT_UNAVAILABLE;
        caveats.push({
          kind: "participant_unavailable",
          message: `${participant.name} is unavailable for ${item.choreographyTitle}${item.groupName ? ` (${item.groupName})` : ""}.`,
          userId: participant.id,
          userName: participant.name,
        });
      }
    }
  }

  const participants = uniqueParticipants(items);

  for (const participant of participants) {
    if (!participant.availableInPeriod) {
      continue;
    }

    const sessions = participantSessions(placements, items, participant.id);
    const byDay = new Map<string, InternalPlacement[]>();
    for (const session of sessions) {
      const key = localDayKey(new Date(session.start));
      const list = byDay.get(key) ?? [];
      list.push(session);
      byDay.set(key, list);
    }

    for (const [dayKey, daySessions] of byDay) {
      daySessions.sort((a, b) => a.start - b.start);
      let streak = 1;
      let maxStreak = 1;

      for (let index = 1; index < daySessions.length; index += 1) {
        const previous = daySessions[index - 1];
        const current = daySessions[index];
        const gap = current.start - previous.end;

        if (gap <= restMs) {
          score += CONSECUTIVE_BONUS;
          streak += 1;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          score -= HOLE_PENALTY;
          streak = 1;
        }
      }

      if (maxStreak > 3) {
        score -= LONG_STREAK_PENALTY;
      }

      const lunch = lunchWindow(parseDayKey(dayKey));
      const lunchBusy = daySessions.some((session) =>
        intervalsOverlap({ start: session.start, end: session.end }, lunch),
      );
      if (lunchBusy) {
        const freeLunch = lunch.end - lunch.start;
        let covered = 0;
        for (const session of daySessions) {
          const overlapStart = Math.max(session.start, lunch.start);
          const overlapEnd = Math.min(session.end, lunch.end);
          if (overlapEnd > overlapStart) {
            covered += overlapEnd - overlapStart;
          }
        }
        if (covered >= freeLunch) {
          score -= LUNCH_PENALTY;
        }
      }
    }
  }

  return { score, caveats };
}
