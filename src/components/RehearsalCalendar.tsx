"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/datetime";
import {
  scheduleEventLabel,
  withParticipantTooltip,
  type SerializedScheduleEvent,
} from "@/lib/schedule-filters";

type CalendarView = "month" | "week" | "threeDay";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const threeDaySpan = 3;

// Matches the Tailwind `md` breakpoint used for the grid layout below.
const smallScreenQuery = "(max-width: 767px)";

function subscribeToSmallScreen(onChange: () => void) {
  const query = window.matchMedia(smallScreenQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useIsSmallScreen() {
  return useSyncExternalStore(
    subscribeToSmallScreen,
    () => window.matchMedia(smallScreenQuery).matches,
    () => false,
  );
}

function eventCellLabel(event: SerializedScheduleEvent): string {
  if (event.typeKind === "REHEARSAL") {
    return event.choreographyTitle ?? scheduleEventLabel(event);
  }
  return scheduleEventLabel(event);
}

function eventCoveredDays(event: SerializedScheduleEvent): Date[] {
  const start = new Date(event.startsAt);
  const first = startOfDay(start);

  if (!event.endsAt) {
    return [first];
  }

  const end = new Date(event.endsAt);
  let last = startOfDay(end);

  // An end at exactly midnight belongs to the previous calendar day.
  if (end.getTime() === last.getTime() && last.getTime() > first.getTime()) {
    last = addDays(last, -1);
  }

  if (last < first) {
    return [first];
  }

  return eachDayOfInterval({ start: first, end: last });
}

function eventTimeLabel(event: SerializedScheduleEvent, day: Date): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const firstDay = startOfDay(start);
  const lastDay = end ? startOfDay(end) : firstDay;
  const endsAtMidnight = Boolean(end && end.getTime() === lastDay.getTime());
  const displayLastDay = endsAtMidnight && lastDay > firstDay ? addDays(lastDay, -1) : lastDay;
  const spansDays = displayLastDay > firstDay;

  if (!spansDays) {
    return formatTime(start);
  }

  if (isSameDay(day, start)) {
    return `${formatTime(start)} →`;
  }

  if (end && isSameDay(day, displayLastDay) && !endsAtMidnight) {
    return `→ ${formatTime(end)}`;
  }

  return "All day";
}

function eventCellTitle(event: SerializedScheduleEvent): string {
  const typeLabel = event.typeName;
  const name = eventCellLabel(event);
  const start = new Date(event.startsAt);
  const range = event.endsAt
    ? `${formatTime(start)} – ${formatTime(new Date(event.endsAt))}`
    : formatTime(start);
  return withParticipantTooltip(
    `${typeLabel}${name ? ` – ${name}` : ""} – ${range}`,
    event.participantNames,
  );
}

function eventCellClassName(kind: SerializedScheduleEvent["typeKind"]): string {
  if (kind === "REPRESENTATION") {
    return "bg-amber-100 text-amber-900 hover:bg-amber-200";
  }
  if (kind === "COMPETITION") {
    return "bg-violet-100 text-violet-900 hover:bg-violet-200";
  }
  if (kind === "DEMONSTRATION") {
    return "bg-teal-100 text-teal-900 hover:bg-teal-200";
  }
  if (kind === "EVENT" || kind === null) {
    return "bg-sky-100 text-sky-900 hover:bg-sky-200";
  }
  return "bg-stone-100 text-stone-800 hover:bg-stone-200";
}

function DayCell({
  day,
  events,
  muted = false,
  tall = false,
  wrapLabels = false,
}: {
  day: Date;
  events: SerializedScheduleEvent[];
  muted?: boolean;
  tall?: boolean;
  wrapLabels?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white p-1.5 sm:p-2",
        tall ? "min-h-36 sm:min-h-48" : "min-h-16 sm:min-h-28",
        muted && "bg-stone-50 text-stone-400",
      )}
    >
      <div
        className={cn(
          "mb-1 text-xs font-medium",
          isToday(day) &&
            "inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white",
        )}
      >
        {format(day, "d")}
      </div>
      <div className="space-y-1">
        {events.map((event) => (
          <Link
            key={event.id}
            href={event.href}
            className={cn(
              "block rounded px-1.5 py-0.5 text-xs hover:opacity-90",
              wrapLabels ? "break-words" : "truncate",
              eventCellClassName(event.typeKind),
            )}
            title={eventCellTitle(event)}
          >
            <span className="font-medium">{eventTimeLabel(event, day)}</span>{" "}
            {eventCellLabel(event)}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function RehearsalCalendar({
  events,
}: {
  events: SerializedScheduleEvent[];
}) {
  const isSmallScreen = useIsSmallScreen();
  const [largeScreenView, setLargeScreenView] = useState<CalendarView>("month");
  const [smallScreenView, setSmallScreenView] = useState<CalendarView>("threeDay");
  const [focusDate, setFocusDate] = useState(() => new Date());

  const view = isSmallScreen ? smallScreenView : largeScreenView;
  const setView = isSmallScreen ? setSmallScreenView : setLargeScreenView;
  const viewOptions: Array<{ value: CalendarView; label: string }> = isSmallScreen
    ? [
        { value: "week", label: "Week" },
        { value: "threeDay", label: "3 days" },
      ]
    : [
        { value: "month", label: "Month" },
        { value: "week", label: "Week" },
      ];

  const eventsByDay = useMemo(() => {
    const map = new Map<string, SerializedScheduleEvent[]>();

    for (const event of events) {
      for (const day of eventCoveredDays(event)) {
        const dayKey = format(day, "yyyy-MM-dd");
        const existing = map.get(dayKey) ?? [];
        existing.push(event);
        map.set(dayKey, existing);
      }
    }

    for (const dayEvents of map.values()) {
      dayEvents.sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }

    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    if (view === "threeDay") {
      const start = startOfDay(focusDate);
      return eachDayOfInterval({ start, end: addDays(start, threeDaySpan - 1) });
    }

    if (view === "week") {
      const weekStart = startOfWeek(focusDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(focusDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }

    const monthStart = startOfMonth(focusDate);
    const monthEnd = endOfMonth(focusDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [focusDate, view]);

  const periodLabel = useMemo(() => {
    if (view === "month") {
      return format(startOfMonth(focusDate), "MMMM yyyy");
    }

    const first = calendarDays[0];
    const last = calendarDays[calendarDays.length - 1];
    return `${format(first, "d MMM")} – ${format(last, "d MMM yyyy")}`;
  }, [calendarDays, focusDate, view]);

  const periodName = view === "threeDay" ? "3 days" : view === "week" ? "week" : "month";

  function shiftFocus(direction: 1 | -1) {
    setFocusDate((date) => {
      if (view === "threeDay") {
        return addDays(date, direction * threeDaySpan);
      }
      if (view === "week") {
        return addWeeks(date, direction);
      }
      return addMonths(date, direction);
    });
  }

  function goToToday() {
    setFocusDate(new Date());
  }

  const currentMonth = startOfMonth(focusDate);

  return (
    <Card className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Calendar</h2>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-stone-200" />
              Rehearsal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-amber-200" />
              Representation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-sky-200" />
              Event
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-violet-200" />
              Competition
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-stone-300 p-0.5">
            {viewOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setView(option.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  view === option.value
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => shiftFocus(-1)}
            className="rounded-lg border border-stone-300 px-3 py-2.5 text-sm hover:bg-stone-100 sm:py-1.5"
            aria-label={`Previous ${periodName}`}
          >
            ←
          </button>
          <span className="min-w-0 flex-1 text-center text-sm font-medium sm:min-w-40 sm:flex-none">
            {periodLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftFocus(1)}
            className="rounded-lg border border-stone-300 px-3 py-2.5 text-sm hover:bg-stone-100 sm:py-1.5"
            aria-label={`Next ${periodName}`}
          >
            →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className={cn(
            "grid gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200",
            view === "threeDay" ? "grid-cols-3" : "min-w-[640px] grid-cols-7",
          )}
        >
          {view === "threeDay"
            ? calendarDays.map((day) => (
                <div
                  key={`header-${format(day, "yyyy-MM-dd")}`}
                  className={cn(
                    "bg-stone-100 px-2 py-2 text-center text-xs font-medium text-stone-600",
                    isToday(day) && "text-stone-900",
                  )}
                >
                  {format(day, "EEE")}
                </div>
              ))
            : weekdays.map((day) => (
                <div
                  key={day}
                  className="bg-stone-100 px-2 py-2 text-center text-xs font-medium text-stone-600"
                >
                  {day}
                </div>
              ))}

          {calendarDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(dayKey) ?? [];

            return (
              <DayCell
                key={dayKey}
                day={day}
                events={dayEvents}
                muted={view === "month" && !isSameMonth(day, currentMonth)}
                tall={view !== "month"}
                wrapLabels={view === "threeDay"}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}
