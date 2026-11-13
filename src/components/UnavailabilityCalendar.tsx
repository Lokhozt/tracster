"use client";

import { useLocale, useTranslations } from "next-intl";

import {
  addDays,
  addMinutes,
  addWeeks,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isSameMonth,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Label, Select } from "@/components/ui";
import { formatTime } from "@/lib/datetime";
import type { SerializedUnavailability } from "@/lib/unavailability";
import { cn } from "@/lib/utils";

const SLOT_MINUTES = 30;
const END_HOUR = 24;
// Half-hour rows shrink so the whole day fits on screen without vertical scrolling.
const MAX_SLOT_HEIGHT_PX = 24;
const MIN_SLOT_HEIGHT_PX = 10;
/** Space kept under the grid (card padding and a little air) when fitting it on screen. */
const FIT_BOTTOM_MARGIN_PX = 24;
const RESIZE_HANDLE_PX = 6;
const LONG_PRESS_MS = 400;
// Long enough that a tap or the start of a swipe never shows the hint.
const LONG_PRESS_HINT_MS = 180;
// A finger is never perfectly still; anything beyond this is a scroll, not a press.
const LONG_PRESS_TOLERANCE_PX = 10;
// The hour ruler stays pinned to the left edge while the week scrolls sideways on
// narrow screens. Sticky needs room to move, so the ruler sits next to the day
// grid rather than inside it. The shadow draws the separator that would otherwise
// scroll away with the first day column.
const HOUR_COLUMN_CLASS =
  "sticky left-0 z-30 w-14 shrink-0 bg-white shadow-[1px_0_0_0_var(--color-stone-200)]";

type Interaction =
  | {
      type: "create";
      dayIndex: number;
      anchorSlot: number;
      currentSlot: number;
    }
  | {
      type: "move";
      id: string;
      dayIndex: number;
      grabOffsetSlots: number;
      durationSlots: number;
      currentSlot: number;
    }
  | {
      type: "resize-start";
      id: string;
      dayIndex: number;
      endSlot: number;
      currentSlot: number;
    }
  | {
      type: "resize-end";
      id: string;
      dayIndex: number;
      startSlot: number;
      currentSlot: number;
    };

type PendingPress = {
  pointerId: number;
  startX: number;
  startY: number;
  timeouts: number[];
};

type DayGrid = {
  startHour: number;
  slotsPerDay: number;
};

function dayGrid(startOfDayHour: number): DayGrid {
  const startHour = Math.max(0, Math.min(23, startOfDayHour));
  return {
    startHour,
    slotsPerDay: ((END_HOUR - startHour) * 60) / SLOT_MINUTES,
  };
}

function slotToDate(
  weekStart: Date,
  dayIndex: number,
  slotIndex: number,
  grid: DayGrid,
): Date {
  const day = addDays(weekStart, dayIndex);
  const base = startOfDay(day);
  const totalMinutes = grid.startHour * 60 + slotIndex * SLOT_MINUTES;
  return setMinutes(setHours(base, Math.floor(totalMinutes / 60)), totalMinutes % 60);
}

function dateToSlot(date: Date, grid: DayGrid): number {
  const minutes = date.getHours() * 60 + date.getMinutes() - grid.startHour * 60;
  return Math.max(0, Math.min(grid.slotsPerDay - 1, Math.round(minutes / SLOT_MINUTES)));
}

// The end can fall on the next day (a block drawn to the bottom of the grid ends
// at midnight), so measure it from the day it is drawn in rather than from its
// own clock time.
function dateToEndSlot(dayStart: Date, end: Date, grid: DayGrid): number {
  const minutes = differenceInMinutes(end, dayStart) - grid.startHour * 60;
  return Math.max(1, Math.min(grid.slotsPerDay, Math.round(minutes / SLOT_MINUTES)));
}

function normalizeSlotRange(startSlot: number, endSlot: number): [number, number] {
  const start = Math.min(startSlot, endSlot);
  const end = Math.max(startSlot, endSlot);
  return [start, Math.max(start + 1, end + 1)];
}

function blockStyle(startSlot: number, endSlot: number, slotHeightPx: number) {
  if (endSlot <= startSlot) {
    return {
      top: startSlot * slotHeightPx,
      height: 2,
    };
  }

  return {
    top: startSlot * slotHeightPx,
    height: (endSlot - startSlot) * slotHeightPx,
  };
}

/**
 * Row height that makes the grid end above the bottom tab bar when the page is scrolled to the
 * top, between MIN and MAX. Measured from the slots row, so everything above it is accounted for.
 */
function useFittedSlotHeight(
  slotsRowRef: React.RefObject<HTMLDivElement | null>,
  slotsPerDay: number,
): number {
  const [slotHeightPx, setSlotHeightPx] = useState(MAX_SLOT_HEIGHT_PX);

  useEffect(() => {
    let frame = 0;
    function measure() {
      const slotsRow = slotsRowRef.current;
      if (!slotsRow) {
        return;
      }
      const top = slotsRow.getBoundingClientRect().top + window.scrollY;
      const bottomBar = document.querySelector<HTMLElement>("[data-bottom-tab-bar]");
      const bottomBarHeight =
        bottomBar && window.getComputedStyle(bottomBar).display !== "none" ? bottomBar.offsetHeight : 0;
      const available = window.innerHeight - top - bottomBarHeight - FIT_BOTTOM_MARGIN_PX;
      const fitted = Math.floor(available / slotsPerDay);
      setSlotHeightPx(Math.max(MIN_SLOT_HEIGHT_PX, Math.min(MAX_SLOT_HEIGHT_PX, fitted)));
    }
    function scheduleMeasure() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    scheduleMeasure();
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [slotsRowRef, slotsPerDay]);

  return slotHeightPx;
}

function isZeroDuration(startsAt: Date, endsAt: Date) {
  return endsAt.getTime() <= startsAt.getTime();
}

type Segment = {
  dayIndex: number;
  startSlot: number;
  endSlot: number;
  startsAt: Date;
  endsAt: Date;
  // A period saved outside the grid can cover several days; dragging and
  // resizing only make sense on a period held in a single column.
  wholePeriod: boolean;
};

// One block per day the period covers, clipped to the visible week.
function timeframeSegments(
  timeframe: SerializedUnavailability,
  weekStart: Date,
  grid: DayGrid,
): Segment[] {
  const start = new Date(timeframe.startsAt);
  const end = new Date(timeframe.endsAt);
  const firstDay = differenceInCalendarDays(start, weekStart);
  // The end is exclusive, so a period ending at midnight stops on the day before.
  const lastDay = differenceInCalendarDays(addMinutes(end, -1), weekStart);
  const wholePeriod = firstDay === lastDay;
  const segments: Segment[] = [];

  for (
    let dayIndex = Math.max(firstDay, 0);
    dayIndex <= Math.min(lastDay, 6);
    dayIndex += 1
  ) {
    const dayStart = startOfDay(addDays(weekStart, dayIndex));
    const segmentStart = dayIndex === firstDay ? start : dayStart;
    const segmentEnd = dayIndex === lastDay ? end : addDays(dayStart, 1);

    segments.push({
      dayIndex,
      startSlot: dateToSlot(segmentStart, grid),
      endSlot: dateToEndSlot(dayStart, segmentEnd, grid),
      startsAt: segmentStart,
      endsAt: segmentEnd,
      wholePeriod,
    });
  }

  return segments;
}

async function fetchTimeframes(
  userId: string,
  from: Date,
  to: Date,
): Promise<SerializedUnavailability[]> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const response = await fetch(`/api/users/${userId}/unavailability?${params.toString()}`);
  if (!response.ok) {
    throw new Error("UNAVAILABILITY_LOAD_FAILED");
  }
  const data = await response.json();
  return data.timeframes as SerializedUnavailability[];
}

export type UnavailabilityUserOption = {
  id: string;
  name: string;
};

export function UnavailabilityCalendar({
  currentUserId,
  users,
  initialTimeframes,
  initialWeekStart,
  startOfDayHour,
}: {
  currentUserId: string;
  users?: UnavailabilityUserOption[];
  initialTimeframes: SerializedUnavailability[];
  // Calendar day (yyyy-MM-dd) rather than an instant: the grid is laid out in the
  // viewer's timezone, which can differ from the server's.
  initialWeekStart: string;
  startOfDayHour: number;
}) {
  const t = useTranslations("Components");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const grid = dayGrid(startOfDayHour);
  const slotsRowRef = useRef<HTMLDivElement>(null);
  const slotHeightPx = useFittedSlotHeight(slotsRowRef, grid.slotsPerDay);
  const gridHeightPx = grid.slotsPerDay * slotHeightPx;
  // Earliest week the user can reach: unavailability is only useful going forward.
  const firstWeekStart = useMemo(
    () => startOfWeek(parseISO(initialWeekStart), { weekStartsOn: 1 }),
    [initialWeekStart],
  );
  const [weekStart, setWeekStart] = useState(firstWeekStart);
  const [viewingUserId, setViewingUserId] = useState(currentUserId);
  const [timeframes, setTimeframes] = useState(initialTimeframes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pendingPressRef = useRef<PendingPress | null>(null);
  const [pressing, setPressing] = useState(false);
  const timeframesRef = useRef(timeframes);
  const scrollLocked = Boolean(selectedId || interaction);

  useEffect(() => {
    timeframesRef.current = timeframes;
  }, [timeframes]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const canGoBack = weekStart.getTime() > firstWeekStart.getTime();

  const fullDayIndexes = useMemo(() => {
    const covered = new Set<number>();
    weekDays.forEach((day, dayIndex) => {
      const dayStart = startOfDay(day).getTime();
      const dayEnd = addDays(startOfDay(day), 1).getTime();
      const isCovered = timeframes.some(
        (entry) =>
          new Date(entry.startsAt).getTime() <= dayStart &&
          new Date(entry.endsAt).getTime() >= dayEnd,
      );
      if (isCovered) {
        covered.add(dayIndex);
      }
    });
    return covered;
  }, [weekDays, timeframes]);

  const selectedTimeframe = useMemo(
    () => timeframes.find((entry) => entry.id === selectedId) ?? null,
    [timeframes, selectedId],
  );

  const loadTimeframes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await fetchTimeframes(viewingUserId, weekStart, weekEnd);
      setTimeframes(entries);
      setSelectedId((current) =>
        current && entries.some((entry) => entry.id === current) ? current : null,
      );
    } catch {
      setError(t("unavailabilityLoadError"));
    } finally {
      setLoading(false);
    }
  }, [viewingUserId, weekStart, weekEnd, t]);

  useEffect(() => {
    // Loading the selected week is the external synchronization owned by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTimeframes();
  }, [loadTimeframes]);

  function pointerToSlot(clientY: number, dayIndex: number): number | null {
    const column = columnRefs.current[dayIndex];
    if (!column) {
      return null;
    }

    const rect = column.getBoundingClientRect();
    const y = clientY - rect.top;
    const slot = Math.floor(y / slotHeightPx);
    return Math.max(0, Math.min(grid.slotsPerDay - 1, slot));
  }

  const cancelPendingPress = useCallback(() => {
    const pending = pendingPressRef.current;
    if (!pending) {
      return;
    }
    pending.timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    pendingPressRef.current = null;
    setPressing(false);
  }, []);

  // Touch gestures are ambiguous: the same swipe can mean "scroll the page" or
  // "draw a block". Scrolling wins unless the finger stays put long enough, or
  // a period is already selected (scroll is locked).
  function beginInteraction(event: React.PointerEvent, start: () => void) {
    if (event.pointerType !== "touch" || selectedId) {
      event.preventDefault();
      start();
      return;
    }

    cancelPendingPress();
    const { pointerId, clientX, clientY } = event;
    const hintTimeoutId = window.setTimeout(() => setPressing(true), LONG_PRESS_HINT_MS);
    const activateTimeoutId = window.setTimeout(() => {
      pendingPressRef.current = null;
      setPressing(false);
      navigator.vibrate?.(15);
      start();
    }, LONG_PRESS_MS);

    pendingPressRef.current = {
      pointerId,
      startX: clientX,
      startY: clientY,
      timeouts: [hintTimeoutId, activateTimeoutId],
    };
  }

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const pending = pendingPressRef.current;
      if (!pending || pending.pointerId !== event.pointerId) {
        return;
      }
      if (
        Math.abs(event.clientX - pending.startX) > LONG_PRESS_TOLERANCE_PX ||
        Math.abs(event.clientY - pending.startY) > LONG_PRESS_TOLERANCE_PX
      ) {
        cancelPendingPress();
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", cancelPendingPress);
    window.addEventListener("pointercancel", cancelPendingPress);
    window.addEventListener("scroll", cancelPendingPress, true);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", cancelPendingPress);
      window.removeEventListener("pointercancel", cancelPendingPress);
      window.removeEventListener("scroll", cancelPendingPress, true);
      cancelPendingPress();
    };
  }, [cancelPendingPress]);

  useEffect(() => {
    if (!scrollLocked) {
      return;
    }

    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    function onTouchMove(event: TouchEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-allow-scroll]")) {
        return;
      }
      event.preventDefault();
    }

    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [scrollLocked]);

  async function toggleDayUnavailable(dayIndex: number) {
    if (saving || interaction) {
      return;
    }

    const startsAt = startOfDay(addDays(weekStart, dayIndex));
    const endsAt = addDays(startsAt, 1);
    const covering = timeframesRef.current.find((entry) => {
      const start = new Date(entry.startsAt).getTime();
      const end = new Date(entry.endsAt).getTime();
      return start <= startsAt.getTime() && end >= endsAt.getTime();
    });

    if (covering) {
      await removeTimeframe(covering.id);
      return;
    }

    // Marking days one after another stays a series of clicks on the dates, so
    // the new day is not selected: that would lock scrolling and hide the days
    // already marked behind the selection panel.
    await persistTimeframe(null, startsAt, endsAt, { select: false });
  }

  async function persistTimeframe(
    id: string | null,
    startsAt: Date,
    endsAt: Date,
    { select = true }: { select?: boolean } = {},
  ) {
    if (isZeroDuration(startsAt, endsAt)) {
      if (id) {
        await removeTimeframe(id);
      }
      return null;
    }

    setSaving(true);
    setError(null);

    const payload = {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };

    const response = await fetch(
      id ? `/api/unavailability/${id}` : `/api/users/${viewingUserId}/unavailability`,
      {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? t("unavailabilitySaveError"));
      await loadTimeframes();
      return null;
    }

    const saved = data.timeframe as SerializedUnavailability;
    const deletedIds = new Set<string>(
      Array.isArray(data.deletedIds) ? data.deletedIds : [],
    );
    setTimeframes((current) =>
      [
        ...current.filter(
          (entry) => entry.id !== saved.id && !deletedIds.has(entry.id),
        ),
        saved,
      ].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    );
    if (select) {
      setSelectedId(saved.id);
    }
    return saved;
  }

  async function handleInteractionEnd(active: Interaction) {
    if (active.type === "create") {
      const [startSlot, endSlot] = normalizeSlotRange(active.anchorSlot, active.currentSlot);
      const startsAt = slotToDate(weekStart, active.dayIndex, startSlot, grid);
      const endsAt = slotToDate(weekStart, active.dayIndex, endSlot, grid);
      await persistTimeframe(null, startsAt, endsAt);
      return;
    }

    const existing = timeframesRef.current.find((entry) => entry.id === active.id);
    if (!existing) {
      return;
    }

    if (active.type === "move") {
      const startSlot = Math.max(
        0,
        Math.min(grid.slotsPerDay - active.durationSlots, active.currentSlot - active.grabOffsetSlots),
      );
      const [existingPosition] = timeframeSegments(existing, weekStart, grid);
      if (
        existingPosition &&
        existingPosition.dayIndex === active.dayIndex &&
        existingPosition.startSlot === startSlot
      ) {
        return;
      }
      const startsAt = slotToDate(weekStart, active.dayIndex, startSlot, grid);
      const endsAt = addMinutes(startsAt, active.durationSlots * SLOT_MINUTES);
      await persistTimeframe(active.id, startsAt, endsAt);
      return;
    }

    if (active.type === "resize-start") {
      const startsAt = slotToDate(weekStart, active.dayIndex, active.currentSlot, grid);
      const endsAt = new Date(existing.endsAt);
      await persistTimeframe(active.id, startsAt, endsAt);
      return;
    }

    const startsAt = new Date(existing.startsAt);
    const endsAt = slotToDate(weekStart, active.dayIndex, active.currentSlot + 1, grid);
    await persistTimeframe(active.id, startsAt, endsAt);
  }

  useEffect(() => {
    if (!interaction) {
      return;
    }

    const activeInteraction = interaction;

    function onMouseMove(event: PointerEvent) {
      const slot = pointerToSlot(event.clientY, activeInteraction.dayIndex);
      if (slot === null) {
        return;
      }

      setInteraction((current) => {
        if (!current) {
          return current;
        }
        return { ...current, currentSlot: slot };
      });
    }

    async function onMouseUp() {
      setInteraction(null);
      await handleInteractionEnd(activeInteraction);
    }

    function onPointerCancel() {
      setInteraction(null);
    }

    // The column keeps `touch-action: auto` so the page scrolls normally, so the
    // drag itself has to stop the browser from scrolling underneath it.
    function onTouchMove(event: TouchEvent) {
      event.preventDefault();
    }

    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);
    window.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [interaction, weekStart]);

  function startCreate(dayIndex: number, slot: number) {
    setSelectedId(null);
    setInteraction({
      type: "create",
      dayIndex,
      anchorSlot: slot,
      currentSlot: slot,
    });
  }

  function startMove(
    id: string,
    dayIndex: number,
    slot: number,
    startSlot: number,
    durationSlots: number,
  ) {
    setSelectedId(id);
    setInteraction({
      type: "move",
      id,
      dayIndex,
      grabOffsetSlots: slot - startSlot,
      durationSlots,
      currentSlot: slot,
    });
  }

  async function removeTimeframe(id: string) {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/unavailability/${id}`, {
      method: "DELETE",
    });

    setSaving(false);

    if (!response.ok) {
      setError(t("unavailabilityDeleteError"));
      await loadTimeframes();
      return;
    }

    setTimeframes((current) => current.filter((entry) => entry.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }

  async function deleteSelected() {
    if (!selectedId) {
      return;
    }

    if (!window.confirm(t("unavailabilityDeleteConfirm"))) {
      return;
    }

    await removeTimeframe(selectedId);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.key !== "Delete") {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!selectedId || interaction || saving) {
        return;
      }

      event.preventDefault();
      void removeTimeframe(selectedId);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, interaction, saving]);

  const draftBlocks = useMemo(() => {
    if (!interaction) {
      return [];
    }

    if (interaction.type === "create") {
      const [startSlot, endSlot] = normalizeSlotRange(
        interaction.anchorSlot,
        interaction.currentSlot,
      );
      const style = blockStyle(startSlot, endSlot, slotHeightPx);
      return [{ dayIndex: interaction.dayIndex, ...style, draft: true }];
    }

    const existing = timeframes.find((entry) => entry.id === interaction.id);
    if (!existing) {
      return [];
    }

    if (interaction.type === "move") {
      const startSlot = Math.max(
        0,
        Math.min(
          grid.slotsPerDay - interaction.durationSlots,
          interaction.currentSlot - interaction.grabOffsetSlots,
        ),
      );
      const endSlot = startSlot + interaction.durationSlots;
      return [
        {
          dayIndex: interaction.dayIndex,
          ...blockStyle(startSlot, endSlot, slotHeightPx),
          draft: true,
        },
      ];
    }

    if (interaction.type === "resize-start") {
      return [
        {
          dayIndex: interaction.dayIndex,
          ...blockStyle(interaction.currentSlot, interaction.endSlot, slotHeightPx),
          draft: true,
        },
      ];
    }

    return [
      {
        dayIndex: interaction.dayIndex,
        ...blockStyle(interaction.startSlot, interaction.currentSlot + 1, slotHeightPx),
        draft: true,
      },
    ];
  }, [interaction, timeframes, weekStart, grid, slotHeightPx]);

  const periodLabel = `${format(weekDays[0], "d MMM", {locale: dateLocale})} – ${format(weekDays[6], "d MMM yyyy", {locale: dateLocale})}`;
  // Phones: "9 – 15 nov." (or "30 nov. – 6 déc.") so the toolbar stays on one line.
  const shortPeriodLabel = isSameMonth(weekDays[0], weekDays[6])
    ? `${format(weekDays[0], "d", { locale: dateLocale })} – ${format(weekDays[6], "d MMM", { locale: dateLocale })}`
    : `${format(weekDays[0], "d MMM", { locale: dateLocale })} – ${format(weekDays[6], "d MMM", { locale: dateLocale })}`;

  return (
    <div className={cn("space-y-4", selectedTimeframe && "pb-24 sm:pb-0")}>
      <Card>
        {users && users.length > 0 && (
          <div className="mb-3 max-w-md sm:mb-4">
            {/* Phones: the select already shows whose calendar this is. */}
            <Label htmlFor="unavailability-user" className="max-sm:sr-only">
              {t("unavailabilityUser")}
            </Label>
            <Select
              id="unavailability-user"
              className="w-full"
              value={viewingUserId}
              disabled={saving || Boolean(interaction)}
              onChange={(event) => {
                const nextId = event.target.value;
                setViewingUserId(nextId);
                setSelectedId(null);
                setInteraction(null);
                setError(null);
              }}
            >
              {users.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.id === currentUserId
                    ? t("unavailabilityUserSelf", { name: entry.name })
                    : entry.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 sm:mb-4">
          {/* Shown in the page's "?" help on phones. */}
          <div className="max-sm:hidden">
            <h2 className="text-lg font-semibold">{t("weekView")}</h2>
            <p className="mt-1 text-sm text-stone-500">
              {t("unavailabilityHelp")}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-wrap">
            <button
              type="button"
              onClick={() => setWeekStart((date) => subWeeks(date, 1))}
              disabled={!canGoBack}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label={t("previousWeek")}
            >
              ←
            </button>
            <span className="min-w-0 flex-1 text-center text-sm font-medium whitespace-nowrap sm:min-w-44 sm:flex-none">
              <span className="sm:hidden">{shortPeriodLabel}</span>
              <span className="max-sm:hidden">{periodLabel}</span>
            </span>
            <button
              type="button"
              onClick={() => setWeekStart((date) => addWeeks(date, 1))}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
              aria-label={t("nextWeek")}
            >
              →
            </button>
            <button
              type="button"
              onClick={() => {
                const current = startOfWeek(new Date(), { weekStartsOn: 1 });
                setWeekStart(
                  current.getTime() < firstWeekStart.getTime() ? firstWeekStart : current,
                );
              }}
              aria-label={t("today")}
              title={t("today")}
              className="inline-flex items-center rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm hover:bg-stone-100 sm:px-3"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 sm:hidden"
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
              <span className="max-sm:hidden">{t("today")}</span>
            </button>
          </div>
        </div>

        {(loading || saving) && (
          <p className="mb-3 text-sm text-stone-500">{saving ? t("saving") : t("loading")}</p>
        )}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div
          className={cn(
            // No left padding on phones: the sticky hours column must reach the card edge,
            // otherwise days scrolling underneath show through the padding gutter.
            "-mx-4 pr-4 sm:mx-0 sm:pr-0",
            scrollLocked ? "overflow-hidden" : "overflow-x-auto",
          )}
        >
          <div className="min-w-[640px] sm:min-w-[760px]">
            <div className="flex border-b border-stone-200">
              <div className={HOUR_COLUMN_CLASS} />
              <div className="grid flex-1 grid-cols-7">
                {weekDays.map((day, dayIndex) => (
                  <div
                    key={day.toISOString()}
                    className="border-l border-stone-200 text-center text-sm font-medium"
                  >
                    <button
                      type="button"
                      className="w-full px-2 py-2 hover:bg-stone-100"
                      disabled={saving}
                      aria-label={
                        fullDayIndexes.has(dayIndex)
                          ? t("clearDayUnavailability", {date: format(day, "EEEE d MMMM", {locale: dateLocale})})
                          : t("markDayUnavailable", {date: format(day, "EEEE d MMMM", {locale: dateLocale})})
                      }
                      onClick={() => void toggleDayUnavailable(dayIndex)}
                    >
                      <span
                        className={cn(
                          isToday(day) &&
                            "inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-stone-900 px-2 text-white",
                        )}
                      >
                        {format(day, "EEE d", {locale: dateLocale})}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div ref={slotsRowRef} className="flex">
              <div className={HOUR_COLUMN_CLASS} style={{ height: gridHeightPx }}>
                {Array.from({ length: grid.slotsPerDay }, (_, slotIndex) =>
                  slotIndex % 2 === 0 ? (
                    <div
                      key={slotIndex}
                      className="absolute right-2 -translate-y-1/2 text-xs text-stone-400"
                      style={{ top: slotIndex * slotHeightPx }}
                    >
                      {format(
                        slotToDate(weekStart, 0, slotIndex, grid),
                        "HH:mm",
                      )}
                    </div>
                  ) : null,
                )}
              </div>

              <div className="grid flex-1 grid-cols-7">
                {weekDays.map((day, dayIndex) => {
                  const dayBlocks = timeframes.flatMap((entry) =>
                    timeframeSegments(entry, weekStart, grid)
                      .filter((segment) => segment.dayIndex === dayIndex)
                      .map((segment) => ({ entry, position: segment })),
                  );

                  const dayDraft = draftBlocks.filter((block) => block.dayIndex === dayIndex);

                  return (
                    <div
                      key={day.toISOString()}
                      ref={(element) => {
                        columnRefs.current[dayIndex] = element;
                      }}
                      className={cn(
                        "relative select-none border-l border-stone-200 bg-white [-webkit-touch-callout:none]",
                        scrollLocked ? "touch-none" : "touch-auto",
                      )}
                      style={{ height: gridHeightPx }}
                      onContextMenu={(event) => event.preventDefault()}
                      onPointerDown={(event) => {
                        if (event.button !== 0 || interaction) {
                          return;
                        }
                        if ((event.target as HTMLElement).closest("[data-block]")) {
                          return;
                        }
                        if (selectedId) {
                          setSelectedId(null);
                          return;
                        }
                        const slot = pointerToSlot(event.clientY, dayIndex);
                        if (slot === null) {
                          return;
                        }
                        beginInteraction(event, () => startCreate(dayIndex, slot));
                      }}
                    >
                      {Array.from({ length: grid.slotsPerDay }, (_, slotIndex) => (
                        <div
                          key={slotIndex}
                          className={cn(
                            "absolute inset-x-0 border-t border-stone-100",
                            slotIndex % 2 === 0 && "border-stone-200",
                          )}
                          style={{
                            top: slotIndex * slotHeightPx,
                            height: slotHeightPx,
                          }}
                        />
                      ))}

                      {dayBlocks.map(({ entry, position }) => {
                        const style = blockStyle(position.startSlot, position.endSlot, slotHeightPx);
                        const durationSlots = Math.max(1, position.endSlot - position.startSlot);
                        const isSelected = selectedId === entry.id;
                        const isDragging =
                          interaction?.type !== "create" && interaction?.id === entry.id;
                        const { startsAt, endsAt } = position;
                        const isFullDay =
                          startsAt.getTime() === startOfDay(startsAt).getTime() &&
                          endsAt.getTime() === addDays(startOfDay(startsAt), 1).getTime();

                        if (isDragging) {
                          return null;
                        }

                        const handleHeight = isSelected ? 16 : RESIZE_HANDLE_PX;

                        return (
                          <div
                            key={`${entry.id}-${dayIndex}`}
                            data-block
                            className={cn(
                              "absolute inset-x-1 z-10 overflow-hidden rounded-md border border-red-300 bg-red-200/90 text-xs text-red-950 shadow-sm",
                              isSelected && "ring-2 ring-red-500",
                            )}
                            style={style}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              if (event.button !== 0 || interaction) {
                                return;
                              }
                              setSelectedId(entry.id);
                              if (!position.wholePeriod) {
                                return;
                              }
                              const target = event.target as HTMLElement;
                              if (target.dataset.handle === "start") {
                                beginInteraction(event, () =>
                                  setInteraction({
                                    type: "resize-start",
                                    id: entry.id,
                                    dayIndex,
                                    endSlot: position.endSlot,
                                    currentSlot: position.startSlot,
                                  }),
                                );
                                return;
                              }
                              if (target.dataset.handle === "end") {
                                beginInteraction(event, () =>
                                  setInteraction({
                                    type: "resize-end",
                                    id: entry.id,
                                    dayIndex,
                                    startSlot: position.startSlot,
                                    currentSlot: position.endSlot,
                                  }),
                                );
                                return;
                              }
                              const slot = pointerToSlot(event.clientY, dayIndex);
                              if (slot === null) {
                                return;
                              }
                              beginInteraction(event, () =>
                                startMove(
                                  entry.id,
                                  dayIndex,
                                  slot,
                                  position.startSlot,
                                  durationSlots,
                                ),
                              );
                            }}
                          >
                            {position.wholePeriod && (
                              <div
                                data-handle="start"
                                className="absolute inset-x-0 top-0 cursor-ns-resize bg-red-400/40"
                                style={{ height: handleHeight }}
                              />
                            )}
                            <div className="pointer-events-none px-2 py-1">
                              <p className="font-medium">
                                {isFullDay
                                  ? t("allDay")
                                  : `${formatTime(startsAt)} – ${formatTime(endsAt)}`}
                              </p>
                            </div>
                            {position.wholePeriod && (
                              <div
                                data-handle="end"
                                className="absolute inset-x-0 bottom-0 cursor-ns-resize bg-red-400/40"
                                style={{ height: handleHeight }}
                              />
                            )}
                          </div>
                        );
                      })}

                      {dayDraft.map((block, index) => (
                        <div
                          key={`draft-${index}`}
                          className="pointer-events-none absolute inset-x-1 z-20 rounded-md border border-dashed border-red-400 bg-red-100/80"
                          style={{ top: block.top, height: block.height }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {selectedTimeframe && (
        <Card
          data-allow-scroll
          className="fixed inset-x-0 bottom-0 z-30 rounded-none border-x-0 border-b-0 sm:static sm:rounded-xl sm:border"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold sm:text-lg">{t("selectedPeriod")}</h3>
              <p className="mt-1 text-sm text-stone-600">
                {dateTimeFormatter.format(new Date(selectedTimeframe.startsAt))} –{" "}
                {dateTimeFormatter.format(new Date(selectedTimeframe.endsAt))}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void deleteSelected()}
            >
              {t("delete")}
            </Button>
          </div>
        </Card>
      )}

      {pressing && (
        <p
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full bg-stone-900/90 px-4 py-2 text-sm text-white"
        >
          {t("holdToDraw")}
        </p>
      )}
    </div>
  );
}
