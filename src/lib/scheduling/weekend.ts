import { addDays, isSaturday, isSunday, nextSaturday, nextSunday, startOfDay } from "date-fns";
import { localDayKey, parseDayKey } from "@/lib/scheduling/intervals";

export function nextWeekendDayKeys(now = new Date()): [string, string] {
  const today = startOfDay(now);

  if (isSaturday(today)) {
    return [localDayKey(today), localDayKey(addDays(today, 1))];
  }

  if (isSunday(today)) {
    return [localDayKey(addDays(today, -1)), localDayKey(today)];
  }

  const saturday = nextSaturday(today);
  const sunday = nextSunday(today);
  return [localDayKey(saturday), localDayKey(sunday)];
}

/** Saturday and Sunday of the weekend after the upcoming one. */
export function weekendAfterNextDayKeys(now = new Date()): [string, string] {
  const [saturday, sunday] = nextWeekendDayKeys(now);
  return [
    localDayKey(addDays(parseDayKey(saturday), 7)),
    localDayKey(addDays(parseDayKey(sunday), 7)),
  ];
}
