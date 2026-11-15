import { attendsRehearsal, isOnUsersAgenda, takesPart } from "@/lib/agenda-rules";
import { getUserScheduleEvents } from "@/lib/schedule";
import { scheduleEventEnd, type SerializedScheduleEvent } from "@/lib/schedule-filters";
import { defaultAssociationStatsPeriodStart } from "@/lib/stats-period";

export type ActivityPeriod = "season" | "all";

export type ActivityMonth = {
  /** First day of the month, ISO. */
  month: string;
  count: number;
};

export type MyActivity = {
  periodStart: string | null;
  rehearsals: {
    attended: number;
    missed: number;
    minutesAttended: number;
  };
  /** Past events taken part in, by event type id (rehearsals excluded). */
  countsByTypeId: Record<string, number>;
  barSlotsHeld: number;
  months: ActivityMonth[];
  upcoming: SerializedScheduleEvent[];
  upcomingCount: number;
};

const UPCOMING_PREVIEW_COUNT = 3;
const ALL_TIME_MONTHS = 12;

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/** Months from `start` to the current month, oldest first. */
function monthRange(start: Date, now: Date): Date[] {
  const months: Date[] = [];
  for (let cursor = monthStart(start); cursor <= now; ) {
    months.push(cursor);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return months;
}

function durationMinutes(event: SerializedScheduleEvent): number {
  return Math.round(
    (scheduleEventEnd(event).getTime() - new Date(event.startsAt).getTime()) / 60_000,
  );
}

export async function loadMyActivity(
  userId: string,
  period: ActivityPeriod,
  now: Date = new Date(),
): Promise<MyActivity> {
  const events = await getUserScheduleEvents(userId);
  const periodStart = period === "season" ? defaultAssociationStatsPeriodStart(now) : null;

  const countsByTypeId: Record<string, number> = {};
  const rehearsals = { attended: 0, missed: 0, minutesAttended: 0 };
  let barSlotsHeld = 0;
  const perMonth = new Map<string, number>();

  const pastEvents = events.filter(
    (event) =>
      scheduleEventEnd(event) <= now &&
      (!periodStart || new Date(event.startsAt) >= periodStart),
  );

  for (const event of pastEvents) {
    if (event.typeKind === "REHEARSAL") {
      if (attendsRehearsal(event)) {
        rehearsals.attended += 1;
        rehearsals.minutesAttended += durationMinutes(event);
      } else if (event.isMember) {
        rehearsals.missed += 1;
      }
    } else if (takesPart(event)) {
      countsByTypeId[event.typeId] = (countsByTypeId[event.typeId] ?? 0) + 1;
    }
    if (event.isBarVolunteer) {
      barSlotsHeld += 1;
    }
    if (takesPart(event)) {
      const key = monthKey(new Date(event.startsAt));
      perMonth.set(key, (perMonth.get(key) ?? 0) + 1);
    }
  }

  const chartStart =
    periodStart ?? new Date(now.getFullYear(), now.getMonth() - (ALL_TIME_MONTHS - 1), 1);
  const months = monthRange(chartStart, now).map((month) => ({
    month: month.toISOString(),
    count: perMonth.get(monthKey(month)) ?? 0,
  }));

  const upcoming = events.filter(
    (event) => scheduleEventEnd(event) > now && isOnUsersAgenda(event),
  );

  return {
    periodStart: periodStart?.toISOString() ?? null,
    rehearsals,
    countsByTypeId,
    barSlotsHeld,
    months,
    upcoming: upcoming.slice(0, UPCOMING_PREVIEW_COUNT),
    upcomingCount: upcoming.length,
  };
}
