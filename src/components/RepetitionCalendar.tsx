"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/datetime";
import type { SerializedScheduleEvent } from "@/lib/schedule";

type CalendarView = "month" | "week";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function eventCellLabel(event: SerializedScheduleEvent): string {
  if (event.type === "event" || event.type === "representation") {
    return event.title ?? (event.type === "event" ? "Event" : "Representation");
  }
  return event.choreographyTitle ?? event.title ?? "";
}

function eventCellTitle(event: SerializedScheduleEvent): string {
  const typeLabel =
    event.type === "representation"
      ? "Representation"
      : event.type === "event"
        ? "Event"
        : "Repetition";
  const name = eventCellLabel(event);
  return `${typeLabel}${name ? ` – ${name}` : ""} – ${formatTime(new Date(event.startsAt))}`;
}

function eventCellClassName(type: SerializedScheduleEvent["type"]): string {
  if (type === "representation") {
    return "bg-amber-100 text-amber-900 hover:bg-amber-200";
  }
  if (type === "event") {
    return "bg-sky-100 text-sky-900 hover:bg-sky-200";
  }
  return "bg-stone-100 text-stone-800 hover:bg-stone-200";
}

function DayCell({
  day,
  events,
  muted = false,
  tall = false,
}: {
  day: Date;
  events: SerializedScheduleEvent[];
  muted?: boolean;
  tall?: boolean;
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
            key={`${event.type}-${event.id}`}
            href={event.href}
            className={cn(
              "block truncate rounded px-1.5 py-0.5 text-xs hover:opacity-90",
              eventCellClassName(event.type),
            )}
            title={eventCellTitle(event)}
          >
            <span className="font-medium">{formatTime(new Date(event.startsAt))}</span>{" "}
            {eventCellLabel(event)}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function RepetitionCalendar({
  events,
}: {
  events: SerializedScheduleEvent[];
}) {
  const [view, setView] = useState<CalendarView>("month");
  const [focusDate, setFocusDate] = useState(() => new Date());

  const eventsByDay = useMemo(() => {
    const map = new Map<string, SerializedScheduleEvent[]>();

    for (const event of events) {
      const dayKey = format(new Date(event.startsAt), "yyyy-MM-dd");
      const existing = map.get(dayKey) ?? [];
      existing.push(event);
      map.set(dayKey, existing);
    }

    for (const dayEvents of map.values()) {
      dayEvents.sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }

    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
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
    if (view === "week") {
      const weekStart = startOfWeek(focusDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(focusDate, { weekStartsOn: 1 });
      return `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`;
    }

    return format(startOfMonth(focusDate), "MMMM yyyy");
  }, [focusDate, view]);

  function goToPrevious() {
    setFocusDate((date) => (view === "week" ? subWeeks(date, 1) : subMonths(date, 1)));
  }

  function goToNext() {
    setFocusDate((date) => (view === "week" ? addWeeks(date, 1) : addMonths(date, 1)));
  }

  function goToToday() {
    setFocusDate(new Date());
  }

  const currentMonth = startOfMonth(focusDate);
  const mobileDays = calendarDays.filter((day) => {
    if (view === "week") {
      return true;
    }
    const dayEvents = eventsByDay.get(format(day, "yyyy-MM-dd")) ?? [];
    return dayEvents.length > 0 && isSameMonth(day, currentMonth);
  });

  return (
    <Card className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Calendar</h2>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-stone-200" />
              Repetition
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-amber-200" />
              Representation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-sky-200" />
              Event
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-stone-300 p-0.5">
            <button
              type="button"
              onClick={() => setView("month")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                view === "month"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100",
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                view === "week"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100",
              )}
            >
              Week
            </button>
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
            onClick={goToPrevious}
            className="rounded-lg border border-stone-300 px-3 py-2.5 text-sm hover:bg-stone-100 sm:py-1.5"
            aria-label={view === "week" ? "Previous week" : "Previous month"}
          >
            ←
          </button>
          <span className="min-w-0 flex-1 text-center text-sm font-medium sm:min-w-40 sm:flex-none">
            {periodLabel}
          </span>
          <button
            type="button"
            onClick={goToNext}
            className="rounded-lg border border-stone-300 px-3 py-2.5 text-sm hover:bg-stone-100 sm:py-1.5"
            aria-label={view === "week" ? "Next week" : "Next month"}
          >
            →
          </button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {mobileDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(dayKey) ?? [];

            return (
              <div key={dayKey} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isToday(day) && "text-stone-900",
                  )}
                >
                  {format(day, "EEE d MMM")}
                  {isToday(day) ? " · Today" : ""}
                </p>
                {dayEvents.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-500">No events</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {dayEvents.map((event) => (
                      <Link
                        key={`${event.type}-${event.id}`}
                        href={event.href}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm",
                          eventCellClassName(event.type),
                        )}
                      >
                        <span className="font-medium">{formatTime(new Date(event.startsAt))}</span>
                        {" · "}
                        {eventCellLabel(event) || eventCellTitle(event)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        {view === "month" && mobileDays.length === 0 && (
            <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-500">
              No events this month.
            </p>
          )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200">
          {weekdays.map((day) => (
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
                tall={view === "week"}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}
