"use client";

import { useLocale, useTranslations } from "next-intl";

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
import { enUS, fr } from "date-fns/locale";
import { Card, SegmentedControl } from "@/components/ui";
import { eventScheduleKindClassName } from "@/lib/event-category-filter";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/datetime";
import {
  scheduleEventLabel,
  scheduleRehearsalTitle,
  withParticipantTooltip,
  type SerializedScheduleEvent,
} from "@/lib/schedule-filters";
import { isBirthdayScheduleEvent } from "@/lib/schedule-birthdays";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";

type CalendarView = "day" | "week" | "month";
type DateLocale = typeof fr;

const MAX_DAY_DOTS = 3;

// Matches the Tailwind `md` breakpoint used for the grid layout below.
const smallScreenQuery = "(max-width: 767px)";
// Phones and tablets (below Tailwind `lg`, where the bottom tab bar shows) open on the day view.
const dayViewDefaultQuery = "(max-width: 1023px)";

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function eventCellLabel(event: SerializedScheduleEvent): string {
  return scheduleRehearsalTitle(event);
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

function eventTimeLabel(
  event: SerializedScheduleEvent,
  day: Date,
  allDayLabel: string,
): string {
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

  return allDayLabel;
}

function eventCellTitle(event: SerializedScheduleEvent): string {
  const typeLabel = event.typeName;
  const name = eventCellLabel(event);
  const groupLine =
    event.typeKind === "REHEARSAL" && event.groupName ? `\n${event.groupName}` : "";
  const start = new Date(event.startsAt);
  const range = event.endsAt
    ? `${formatTime(start)} – ${formatTime(new Date(event.endsAt))}`
    : formatTime(start);
  return withParticipantTooltip(
    `${typeLabel}${name ? ` – ${name}` : ""}${groupLine} – ${range}`,
    event.participantNames,
  );
}

function eventCellClassName(event: SerializedScheduleEvent): string {
  if (isBirthdayScheduleEvent(event)) {
    return "bg-pink-100 text-pink-900";
  }
  return eventScheduleKindClassName(event.typeKind, { hover: true });
}

/** Solid version of the event-kind hue, for the small dots in the day strip and compact month. */
function eventDotClassName(event: SerializedScheduleEvent): string {
  if (isBirthdayScheduleEvent(event)) {
    return "bg-pink-400";
  }
  switch (event.typeKind) {
    case "REHEARSAL":
      return "bg-stone-500";
    case "REPRESENTATION":
      return "bg-amber-500";
    case "COMPETITION":
      return "bg-violet-500";
    case "DEMONSTRATION":
      return "bg-teal-500";
    case "FESTIVAL":
      return "bg-rose-500";
    case "TRAINING":
      return "bg-orange-500";
    case "PARTY":
      return "bg-fuchsia-500";
    default:
      return "bg-sky-500";
  }
}

/** Like `eventTimeLabel`, but shows the full "18:00 – 19:30" range for same-day events. */
function agendaTimeLabel(
  event: SerializedScheduleEvent,
  day: Date,
  allDayLabel: string,
): string {
  const label = eventTimeLabel(event, day, allDayLabel);
  const startLabel = formatTime(new Date(event.startsAt));
  if (label !== startLabel || !event.endsAt) {
    return label;
  }
  return `${startLabel} – ${formatTime(new Date(event.endsAt))}`;
}

function smallScreenCellFrame(index: number, lastVisibleIndex: number, header: boolean) {
  const isFirst = index === 0;
  const isLast = index === lastVisibleIndex;
  return cn(
    "overflow-hidden border-stone-200",
    "border-l",
    isLast && "border-r",
    header ? "border-t border-b" : "border-b",
    isFirst && header && "rounded-tl-lg",
    isFirst && !header && "rounded-bl-lg",
    isLast && header && "rounded-tr-lg",
    isLast && !header && "rounded-br-lg",
  );
}

function TodayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
      <circle cx="12" cy="15" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function buildEventsByDay(eventList: SerializedScheduleEvent[]) {
  const map = new Map<string, SerializedScheduleEvent[]>();

  for (const event of eventList) {
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
}

function chunkWeekRows(days: Date[]): Date[][] {
  const rows: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    rows.push(days.slice(index, index + 7));
  }
  return rows;
}

function rowMaxEventCount(row: Date[], eventsByDay: Map<string, SerializedScheduleEvent[]>) {
  return row.reduce((max, day) => {
    const count = eventsByDay.get(format(day, "yyyy-MM-dd"))?.length ?? 0;
    return Math.max(max, count);
  }, 0);
}

function DayCell({
  day,
  events,
  rowEventCount,
  muted = false,
  tall = false,
  wrapLabels = false,
}: {
  day: Date;
  events: SerializedScheduleEvent[];
  /** Max visible events on any day in this calendar row (equal event band height). */
  rowEventCount: number;
  muted?: boolean;
  tall?: boolean;
  wrapLabels?: boolean;
}) {
  const t = useTranslations("Components");
  const slotRem = tall ? 2.75 : 1.75;
  const eventsAreaMinHeight =
    rowEventCount > 0 ? `${rowEventCount * slotRem}rem` : undefined;
  return (
    <div
      className={cn(
        "planning-calendar-day flex h-full min-h-0 flex-col bg-white p-1.5 sm:p-2",
        muted && "planning-calendar-day-muted bg-stone-50 text-stone-400",
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
      <div
        className="min-h-0 flex-1 space-y-1"
        style={eventsAreaMinHeight ? { minHeight: eventsAreaMinHeight } : undefined}
      >
        {events.map((event) => {
          const hasGroupLine = event.typeKind === "REHEARSAL" && Boolean(event.groupName);
          const className = cn(
            // Hyphenate (page language) rather than split a word anywhere ("Assem-blée", not "Assembl/ée").
            "rounded px-1.5 py-0.5 text-xs break-words hyphens-auto",
            wrapLabels ? "block" : hasGroupLine ? "line-clamp-4" : "line-clamp-2",
            hasGroupLine && "min-h-[3.25rem]",
            eventCellClassName(event),
            event.href && "hover:opacity-90",
          );
          const content = (
            <>
              <span className="font-medium">{eventTimeLabel(event, day, t("allDay"))}</span>
              <span className="mt-0.5 block font-medium leading-tight">{eventCellLabel(event)}</span>
              {event.typeKind === "REHEARSAL" && event.groupName && (
                <span className="block text-[10px] leading-tight opacity-90">{event.groupName}</span>
              )}
            </>
          );

          if (!event.href) {
            return (
              <span key={event.id} className={className} title={eventCellTitle(event)}>
                {content}
              </span>
            );
          }

          return (
            <Link
              key={event.id}
              href={event.href}
              className={className}
              title={eventCellTitle(event)}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DayDotsButton({
  day,
  events,
  dateLocale,
  onSelect,
  selected = false,
  muted = false,
  weekdayLabel,
}: {
  day: Date;
  events: SerializedScheduleEvent[];
  dateLocale: DateLocale;
  onSelect: (day: Date) => void;
  selected?: boolean;
  muted?: boolean;
  weekdayLabel?: string;
}) {
  const t = useTranslations("Components");
  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-pressed={selected}
      aria-label={t("dayEventCount", {
        date: format(day, "EEEE d MMMM", { locale: dateLocale }),
        count: events.length,
      })}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 transition",
        selected ? "bg-stone-900 text-white" : "hover:bg-stone-900/5",
        muted && !selected && "text-stone-400",
      )}
    >
      {weekdayLabel && <span className="text-[11px] leading-none opacity-80">{weekdayLabel}</span>}
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
          isToday(day) && !selected && "ring-2 ring-stone-900",
        )}
      >
        {format(day, "d")}
      </span>
      <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
        {events.slice(0, MAX_DAY_DOTS).map((event) => (
          <span key={event.id} className={cn("h-1.5 w-1.5 rounded-full", eventDotClassName(event))} />
        ))}
        {events.length > MAX_DAY_DOTS && <span className="text-[9px] leading-none">+</span>}
      </span>
    </button>
  );
}

function AgendaEvent({ event, day }: { event: SerializedScheduleEvent; day: Date }) {
  const t = useTranslations("Components");
  const isBirthday = isBirthdayScheduleEvent(event);
  const details = [
    event.typeName,
    event.typeKind === "REHEARSAL" ? event.groupName : null,
    event.location,
  ]
    .filter(Boolean)
    .join(" · ");
  const className = cn(
    "block rounded-lg px-3 py-2.5 text-sm",
    eventCellClassName(event),
    event.href && "hover:opacity-90",
  );
  const content = (
    <>
      {!isBirthday && (
        <span className="block text-xs font-medium opacity-80">
          {agendaTimeLabel(event, day, t("allDay"))}
        </span>
      )}
      <span className="block font-semibold leading-snug">{eventCellLabel(event)}</span>
      {!isBirthday && details && <span className="mt-0.5 block text-xs opacity-80">{details}</span>}
    </>
  );

  if (!event.href) {
    return (
      <div className={className} title={eventCellTitle(event)}>
        {content}
      </div>
    );
  }
  return (
    <Link href={event.href} className={className} title={eventCellTitle(event)}>
      {content}
    </Link>
  );
}

/** Week strip with event dots, then the selected day's events at full width. */
function DayAgenda({
  focusDate,
  weekDays,
  eventsByDay,
  dateLocale,
  onSelectDay,
}: {
  focusDate: Date;
  weekDays: Date[];
  eventsByDay: Map<string, SerializedScheduleEvent[]>;
  dateLocale: DateLocale;
  onSelectDay: (day: Date) => void;
}) {
  const t = useTranslations("Components");
  const dayEvents = eventsByDay.get(format(focusDate, "yyyy-MM-dd")) ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <DayDotsButton
            key={format(day, "yyyy-MM-dd")}
            day={day}
            events={eventsByDay.get(format(day, "yyyy-MM-dd")) ?? []}
            dateLocale={dateLocale}
            onSelect={onSelectDay}
            selected={isSameDay(day, focusDate)}
            weekdayLabel={format(day, "EEE", { locale: dateLocale })}
          />
        ))}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-stone-700 first-letter:uppercase">
          {format(focusDate, "EEEE d MMMM", { locale: dateLocale })}
        </h3>
        {dayEvents.length === 0 ? (
          <p className="rounded-lg bg-white/60 px-3 py-6 text-center text-sm text-stone-500">
            {t("noEventsOnDay")}
          </p>
        ) : (
          <ul className="space-y-2">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <AgendaEvent event={event} day={focusDate} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function RehearsalCalendar({
  events,
  titleActions,
  fillHeight = false,
}: {
  events: SerializedScheduleEvent[];
  titleActions?: React.ReactNode;
  /** Wide screens (xl+): stretch to the parent's height; rows share it, the body scrolls if needed. */
  fillHeight?: boolean;
}) {
  const t = useTranslations("Components");
  const isSmallScreen = useMediaQuery(smallScreenQuery);
  const prefersDayView = useMediaQuery(dayViewDefaultQuery);
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  // null until the user picks a view: phones and tablets default to the day agenda, desktop to the week.
  const [chosenView, setChosenView] = useState<CalendarView | null>(null);
  const [focusDate, setFocusDate] = useState(() => new Date());

  const view: CalendarView = chosenView ?? (prefersDayView ? "day" : "week");
  const viewOptions: Array<{ value: CalendarView; label: string }> = [
    { value: "day", label: t("day") },
    { value: "week", label: t("week") },
    { value: "month", label: t("month") },
  ];

  const eventsByDay = useMemo(() => buildEventsByDay(events), [events]);

  const calendarDays = useMemo(() => {
    if (view === "day" || view === "week") {
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
      return format(startOfMonth(focusDate), "MMMM yyyy", {locale: dateLocale});
    }

    const first = calendarDays[0];
    const last = calendarDays[calendarDays.length - 1];
    return `${format(first, "d MMM", {locale: dateLocale})} – ${format(last, "d MMM yyyy", {locale: dateLocale})}`;
  }, [calendarDays, dateLocale, focusDate, view]);

  // The day view shows a week strip, so its arrows move by week, keeping the weekday.
  const periodName = view === "month" ? t("month") : t("week");

  function shiftFocus(direction: 1 | -1) {
    setFocusDate((date) => (view === "month" ? addMonths(date, direction) : addWeeks(date, direction)));
  }

  function openDay(day: Date) {
    setFocusDate(day);
    setChosenView("day");
  }

  function goToToday() {
    setFocusDate(new Date());
  }

  const currentMonth = startOfMonth(focusDate);
  const weekRows = useMemo(() => chunkWeekRows(calendarDays), [calendarDays]);
  const rowEventCounts = useMemo(
    () => weekRows.map((row) => rowMaxEventCount(row, eventsByDay)),
    [eventsByDay, weekRows],
  );

  const viewSwitch = (
    <SegmentedControl
      className="sm:min-w-64"
      label={t("calendarView")}
      value={view}
      onChange={setChosenView}
      options={viewOptions}
    />
  );

  return (
    <Card
      className={cn(
        "planning-calendar mb-8 [overflow-anchor:none]",
        fillHeight && "xl:mb-0 xl:flex xl:min-h-0 xl:flex-col",
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Export/edit at the top: below the calendar they sat under the phone's floating "+". */}
        {titleActions && <div className="flex shrink-0 gap-2">{titleActions}</div>}
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {!isSmallScreen && (
            <div className="flex flex-wrap items-center gap-2">
              {viewSwitch}

              <button
                type="button"
                onClick={goToToday}
                className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm hover:bg-stone-100"
              >
                {t("today")}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isSmallScreen && (
              <button
                type="button"
                onClick={goToToday}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-900 hover:bg-stone-100"
                aria-label={t("today")}
                title={t("today")}
              >
                <TodayIcon />
              </button>
            )}
            <button
              type="button"
              onClick={() => shiftFocus(-1)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 hover:bg-stone-100"
              aria-label={t("previousPeriod", {period: periodName})}
            >
              <ArrowLeftIcon />
            </button>
            <span className="min-w-0 flex-1 text-center text-sm font-medium sm:min-w-40 sm:flex-none">
              {periodLabel}
            </span>
            <button
              type="button"
              onClick={() => shiftFocus(1)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 hover:bg-stone-100"
              aria-label={t("nextPeriod", {period: periodName})}
            >
              <ArrowRightIcon />
            </button>
          </div>
          {isSmallScreen && viewSwitch}
        </div>
      </div>

      <div className={cn(fillHeight && "xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:overflow-y-auto")}>
        {view === "day" ? (
          <DayAgenda
            focusDate={focusDate}
            weekDays={calendarDays}
            eventsByDay={eventsByDay}
            dateLocale={dateLocale}
            onSelectDay={setFocusDate}
          />
        ) : isSmallScreen && view === "month" ? (
          <div className="space-y-1">
            <div className="grid grid-cols-7 gap-1">
              {weekRows[0].map((day) => (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className="text-center text-[11px] font-medium text-stone-500"
                >
                  {format(day, "EEEEE", { locale: dateLocale })}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => (
                <DayDotsButton
                  key={format(day, "yyyy-MM-dd")}
                  day={day}
                  events={eventsByDay.get(format(day, "yyyy-MM-dd")) ?? []}
                  dateLocale={dateLocale}
                  onSelect={openDay}
                  muted={!isSameMonth(day, currentMonth)}
                />
              ))}
            </div>
          </div>
        ) : isSmallScreen ? (
          <div className="space-y-3">
            {[calendarDays.slice(0, 4), calendarDays.slice(4)].map((days) => {
              const rowEventCount = rowMaxEventCount(days, eventsByDay);
              const columns: Array<Date | null> = days.length === 4 ? days : [...days, null];
              const lastVisibleIndex = columns.reduce(
                (last, day, index) => (day ? index : last),
                0,
              );
              const showsSpacer = lastVisibleIndex < columns.length - 1;
              return (
                <div
                  key={format(days[0], "yyyy-MM-dd")}
                  className={cn(
                    "grid grid-cols-4 items-stretch",
                    !showsSpacer &&
                      "planning-calendar-grid gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200",
                  )}
                >
                  {columns.map((day, index) =>
                    day ? (
                      <div
                        key={`header-${format(day, "yyyy-MM-dd")}`}
                        className={cn(
                          "planning-calendar-day-header bg-stone-100 px-1 py-2 text-center text-xs font-medium text-stone-600",
                          isToday(day) && "text-stone-900",
                          showsSpacer && smallScreenCellFrame(index, lastVisibleIndex, true),
                        )}
                      >
                        {format(day, "EEE", { locale: dateLocale })}
                      </div>
                    ) : (
                      <div key="header-empty" aria-hidden="true" />
                    ),
                  )}
                  {columns.map((day, index) => {
                    if (!day) {
                      return <div key="day-empty" aria-hidden="true" />;
                    }
                    const dayKey = format(day, "yyyy-MM-dd");
                    return (
                      <div
                        key={dayKey}
                        className={cn(
                          "flex min-h-0 flex-col",
                          showsSpacer ? smallScreenCellFrame(index, lastVisibleIndex, false) : "h-full",
                        )}
                      >
                        <DayCell
                          day={day}
                          events={eventsByDay.get(dayKey) ?? []}
                          rowEventCount={rowEventCount}
                          tall
                          wrapLabels
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={cn("overflow-x-auto", fillHeight && "xl:flex xl:flex-1 xl:flex-col")}>
            <div
              className={cn(
                "min-w-[640px] space-y-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200",
                // Next to the event list the card can be narrower than 640px: fit it instead of scrolling.
                fillHeight && "xl:flex xl:min-w-0 xl:flex-1 xl:flex-col",
              )}
            >
              <div className="planning-calendar-grid grid grid-cols-7 gap-px bg-stone-200">
                {weekRows[0].map((day) => (
                  <div
                    key={format(day, "yyyy-MM-dd")}
                    className="planning-calendar-day-header bg-stone-100 px-2 py-2 text-center text-xs font-medium text-stone-600"
                  >
                    {format(day, "EEE", { locale: dateLocale })}
                  </div>
                ))}
              </div>
              {weekRows.map((row, rowIndex) => (
                <div
                  key={format(row[0], "yyyy-MM-dd")}
                  className={cn(
                    "planning-calendar-grid grid grid-cols-7 items-stretch gap-px bg-stone-200",
                    // Computers: a real planner height instead of a thin strip.
                    view === "week" && "lg:min-h-[26rem]",
                    view === "month" && "lg:min-h-[7rem]",
                    // Rows share the available height when the calendar fills the window.
                    fillHeight && "xl:min-h-0 xl:flex-1",
                  )}
                >
                  {row.map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayEvents = eventsByDay.get(dayKey) ?? [];

                    return (
                      <DayCell
                        key={dayKey}
                        day={day}
                        events={dayEvents}
                        rowEventCount={rowEventCounts[rowIndex] ?? 0}
                        muted={view === "month" && !isSameMonth(day, currentMonth)}
                        tall={view !== "month"}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </Card>
  );
}
