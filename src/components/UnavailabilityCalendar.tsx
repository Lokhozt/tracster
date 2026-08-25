"use client";

import {
  addDays,
  addMinutes,
  addWeeks,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { formatDateTime, formatTime } from "@/lib/datetime";
import type { SerializedUnavailability } from "@/lib/unavailability";
import { cn } from "@/lib/utils";

const SLOT_MINUTES = 30;
const END_HOUR = 24;
const SLOT_HEIGHT_PX = 24;
const RESIZE_HANDLE_PX = 6;
const LONG_PRESS_MS = 400;
// Long enough that a tap or the start of a swipe never shows the hint.
const LONG_PRESS_HINT_MS = 180;
// A finger is never perfectly still; anything beyond this is a scroll, not a press.
const LONG_PRESS_TOLERANCE_PX = 10;

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
// at midnight), so measure it from the start day instead of its own clock time.
function dateToEndSlot(start: Date, end: Date, grid: DayGrid): number {
  const minutes = differenceInMinutes(end, startOfDay(start)) - grid.startHour * 60;
  return Math.max(1, Math.min(grid.slotsPerDay, Math.round(minutes / SLOT_MINUTES)));
}

function normalizeSlotRange(startSlot: number, endSlot: number): [number, number] {
  const start = Math.min(startSlot, endSlot);
  const end = Math.max(startSlot, endSlot);
  return [start, Math.max(start + 1, end + 1)];
}

function blockStyle(startSlot: number, endSlot: number) {
  if (endSlot <= startSlot) {
    return {
      top: startSlot * SLOT_HEIGHT_PX,
      height: 2,
    };
  }

  return {
    top: startSlot * SLOT_HEIGHT_PX,
    height: (endSlot - startSlot) * SLOT_HEIGHT_PX,
  };
}

function isZeroDuration(startsAt: Date, endsAt: Date) {
  return endsAt.getTime() <= startsAt.getTime();
}

function timeframeToSlots(
  timeframe: SerializedUnavailability,
  weekStart: Date,
  grid: DayGrid,
): {
  dayIndex: number;
  startSlot: number;
  endSlot: number;
} | null {
  const start = new Date(timeframe.startsAt);
  const end = new Date(timeframe.endsAt);
  const dayIndex = differenceInCalendarDays(start, weekStart);

  if (dayIndex < 0 || dayIndex > 6) {
    return null;
  }

  return {
    dayIndex,
    startSlot: dateToSlot(start, grid),
    endSlot: dateToEndSlot(start, end, grid),
  };
}

async function fetchTimeframes(from: Date, to: Date): Promise<SerializedUnavailability[]> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const response = await fetch(`/api/users/me/unavailability?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Unable to load unavailability.");
  }
  const data = await response.json();
  return data.timeframes as SerializedUnavailability[];
}

export function UnavailabilityCalendar({
  initialTimeframes,
  initialWeekStart,
  startOfDayHour,
}: {
  initialTimeframes: SerializedUnavailability[];
  // Calendar day (yyyy-MM-dd) rather than an instant: the grid is laid out in the
  // viewer's timezone, which can differ from the server's.
  initialWeekStart: string;
  startOfDayHour: number;
}) {
  const grid = dayGrid(startOfDayHour);
  const gridHeightPx = grid.slotsPerDay * SLOT_HEIGHT_PX;
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(parseISO(initialWeekStart), { weekStartsOn: 1 }),
  );
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
  timeframesRef.current = timeframes;
  const scrollLocked = Boolean(selectedId || interaction);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const selectedTimeframe = useMemo(
    () => timeframes.find((entry) => entry.id === selectedId) ?? null,
    [timeframes, selectedId],
  );

  const loadTimeframes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await fetchTimeframes(weekStart, weekEnd);
      setTimeframes(entries);
      setSelectedId((current) =>
        current && entries.some((entry) => entry.id === current) ? current : null,
      );
    } catch {
      setError("Unable to load unavailability for this week.");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    void loadTimeframes();
  }, [loadTimeframes]);

  function pointerToSlot(clientY: number, dayIndex: number): number | null {
    const column = columnRefs.current[dayIndex];
    if (!column) {
      return null;
    }

    const rect = column.getBoundingClientRect();
    const y = clientY - rect.top;
    const slot = Math.floor(y / SLOT_HEIGHT_PX);
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

  async function persistTimeframe(id: string | null, startsAt: Date, endsAt: Date) {
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
      id ? `/api/unavailability/${id}` : "/api/users/me/unavailability",
      {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to save unavailability.");
      await loadTimeframes();
      return null;
    }

    const saved = data.timeframe as SerializedUnavailability;
    setTimeframes((current) => {
      if (id) {
        return current.map((entry) => (entry.id === id ? saved : entry));
      }
      return [...current, saved].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    });
    setSelectedId(saved.id);
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
      const existingPosition = timeframeToSlots(existing, weekStart, grid);
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
      setError("Unable to delete unavailability.");
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

    if (!window.confirm("Delete this unavailability period?")) {
      return;
    }

    await removeTimeframe(selectedId);
  }

  const draftBlocks = useMemo(() => {
    if (!interaction) {
      return [];
    }

    if (interaction.type === "create") {
      const [startSlot, endSlot] = normalizeSlotRange(
        interaction.anchorSlot,
        interaction.currentSlot,
      );
      const style = blockStyle(startSlot, endSlot);
      return [{ dayIndex: interaction.dayIndex, ...style, draft: true }];
    }

    const existing = timeframes.find((entry) => entry.id === interaction.id);
    if (!existing) {
      return [];
    }

    const position = timeframeToSlots(existing, weekStart, grid);
    if (!position) {
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
          ...blockStyle(startSlot, endSlot),
          draft: true,
        },
      ];
    }

    if (interaction.type === "resize-start") {
      return [
        {
          dayIndex: interaction.dayIndex,
          ...blockStyle(interaction.currentSlot, interaction.endSlot),
          draft: true,
        },
      ];
    }

    return [
      {
        dayIndex: interaction.dayIndex,
        ...blockStyle(interaction.startSlot, interaction.currentSlot + 1),
        draft: true,
      },
    ];
  }, [interaction, timeframes, weekStart, grid]);

  const periodLabel = `${format(weekDays[0], "d MMM")} – ${format(weekDays[6], "d MMM yyyy")}`;

  return (
    <div className={cn("space-y-4", selectedTimeframe && "pb-24 sm:pb-0")}>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Week view</h2>
            <p className="mt-1 text-sm text-stone-500">
              Click and drag on the grid to add periods. Drag blocks to move, or resize from the
              edges. On a touch screen, press and hold to start drawing — a plain swipe scrolls.
              Tap a period to select it and lock scrolling so you can drag or resize. Tap empty
              space to deselect. Collapse a period to nothing to remove it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart((date) => subWeeks(date, 1))}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
              aria-label="Previous week"
            >
              ←
            </button>
            <span className="min-w-0 flex-1 text-center text-sm font-medium sm:min-w-44 sm:flex-none">
              {periodLabel}
            </span>
            <button
              type="button"
              onClick={() => setWeekStart((date) => addWeeks(date, 1))}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
              aria-label="Next week"
            >
              →
            </button>
            <button
              type="button"
              onClick={() =>
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
              }
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
            >
              Today
            </button>
          </div>
        </div>

        {(loading || saving) && (
          <p className="mb-3 text-sm text-stone-500">{saving ? "Saving…" : "Loading…"}</p>
        )}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div
          className={cn(
            "-mx-4 px-4 sm:mx-0 sm:px-0",
            scrollLocked ? "overflow-hidden" : "overflow-x-auto",
          )}
        >
          <div className="min-w-[640px] sm:min-w-[760px]">
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-stone-200">
              <div />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="border-l border-stone-200 px-2 py-2 text-center text-sm font-medium"
                >
                  <span
                    className={cn(
                      isToday(day) &&
                        "inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-stone-900 px-2 text-white",
                    )}
                  >
                    {format(day, "EEE d")}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              <div className="relative" style={{ height: gridHeightPx }}>
                {Array.from({ length: grid.slotsPerDay }, (_, slotIndex) =>
                  slotIndex % 2 === 0 ? (
                    <div
                      key={slotIndex}
                      className="absolute right-2 -translate-y-1/2 text-xs text-stone-400"
                      style={{ top: slotIndex * SLOT_HEIGHT_PX }}
                    >
                      {format(
                        slotToDate(weekStart, 0, slotIndex, grid),
                        "HH:mm",
                      )}
                    </div>
                  ) : null,
                )}
              </div>

              {weekDays.map((day, dayIndex) => {
                const dayBlocks = timeframes
                  .map((entry) => ({ entry, position: timeframeToSlots(entry, weekStart, grid) }))
                  .filter(
                    (item): item is {
                      entry: SerializedUnavailability;
                      position: NonNullable<ReturnType<typeof timeframeToSlots>>;
                    } => item.position?.dayIndex === dayIndex,
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
                          top: slotIndex * SLOT_HEIGHT_PX,
                          height: SLOT_HEIGHT_PX,
                        }}
                      />
                    ))}

                    {dayBlocks.map(({ entry, position }) => {
                      const style = blockStyle(position.startSlot, position.endSlot);
                      const durationSlots = Math.max(
                        1,
                        Math.round(
                          differenceInMinutes(
                            new Date(entry.endsAt),
                            new Date(entry.startsAt),
                          ) / SLOT_MINUTES,
                        ),
                      );
                      const isSelected = selectedId === entry.id;
                      const isDragging =
                        interaction?.type !== "create" && interaction?.id === entry.id;

                      if (isDragging) {
                        return null;
                      }

                      const handleHeight = isSelected ? 16 : RESIZE_HANDLE_PX;

                      return (
                        <div
                          key={entry.id}
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
                          <div
                            data-handle="start"
                            className="absolute inset-x-0 top-0 cursor-ns-resize bg-red-400/40"
                            style={{ height: handleHeight }}
                          />
                          <div className="pointer-events-none px-2 py-1">
                            <p className="font-medium">
                              {formatTime(new Date(entry.startsAt))} –{" "}
                              {formatTime(new Date(entry.endsAt))}
                            </p>
                          </div>
                          <div
                            data-handle="end"
                            className="absolute inset-x-0 bottom-0 cursor-ns-resize bg-red-400/40"
                            style={{ height: handleHeight }}
                          />
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
      </Card>

      {selectedTimeframe && (
        <Card
          data-allow-scroll
          className="fixed inset-x-0 bottom-0 z-30 rounded-none border-x-0 border-b-0 sm:static sm:rounded-xl sm:border"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold sm:text-lg">Selected period</h3>
              <p className="mt-1 text-sm text-stone-600">
                {formatDateTime(new Date(selectedTimeframe.startsAt))} –{" "}
                {formatDateTime(new Date(selectedTimeframe.endsAt))}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void deleteSelected()}
            >
              Delete
            </Button>
          </div>
        </Card>
      )}

      {pressing && (
        <p
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full bg-stone-900/90 px-4 py-2 text-sm text-white"
        >
          Hold to draw…
        </p>
      )}
    </div>
  );
}
