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
import { Button, Card, Label, Textarea } from "@/components/ui";
import { formatDateTime, formatTime } from "@/lib/datetime";
import type { SerializedUnavailability } from "@/lib/unavailability";
import { cn } from "@/lib/utils";

const SLOT_MINUTES = 30;
const START_HOUR = 6;
const END_HOUR = 24;
const SLOT_HEIGHT_PX = 24;
const SLOTS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const GRID_HEIGHT_PX = SLOTS_PER_DAY * SLOT_HEIGHT_PX;
const RESIZE_HANDLE_PX = 6;

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

function slotToDate(weekStart: Date, dayIndex: number, slotIndex: number): Date {
  const day = addDays(weekStart, dayIndex);
  const base = startOfDay(day);
  const totalMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  return setMinutes(setHours(base, Math.floor(totalMinutes / 60)), totalMinutes % 60);
}

function dateToSlot(date: Date): number {
  const minutes = date.getHours() * 60 + date.getMinutes() - START_HOUR * 60;
  return Math.max(0, Math.min(SLOTS_PER_DAY - 1, Math.round(minutes / SLOT_MINUTES)));
}

// The end can fall on the next day (a block drawn to the bottom of the grid ends
// at midnight), so measure it from the start day instead of its own clock time.
function dateToEndSlot(start: Date, end: Date): number {
  const minutes = differenceInMinutes(end, startOfDay(start)) - START_HOUR * 60;
  return Math.max(1, Math.min(SLOTS_PER_DAY, Math.round(minutes / SLOT_MINUTES)));
}

function normalizeSlotRange(startSlot: number, endSlot: number): [number, number] {
  const start = Math.min(startSlot, endSlot);
  const end = Math.max(startSlot, endSlot);
  return [start, Math.max(start + 1, end + 1)];
}

function blockStyle(startSlot: number, endSlot: number) {
  const [start, end] = normalizeSlotRange(startSlot, endSlot - 1);
  const normalizedEnd = end;
  return {
    top: start * SLOT_HEIGHT_PX,
    height: Math.max(SLOT_HEIGHT_PX, (normalizedEnd - start) * SLOT_HEIGHT_PX),
  };
}

function timeframeToSlots(timeframe: SerializedUnavailability, weekStart: Date): {
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
    startSlot: dateToSlot(start),
    endSlot: dateToEndSlot(start, end),
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
}: {
  initialTimeframes: SerializedUnavailability[];
  // Calendar day (yyyy-MM-dd) rather than an instant: the grid is laid out in the
  // viewer's timezone, which can differ from the server's.
  initialWeekStart: string;
}) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(parseISO(initialWeekStart), { weekStartsOn: 1 }),
  );
  const [timeframes, setTimeframes] = useState(initialTimeframes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timeframesRef = useRef(timeframes);
  timeframesRef.current = timeframes;

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

  useEffect(() => {
    if (selectedTimeframe) {
      setNotesDraft(selectedTimeframe.notes ?? "");
    }
  }, [selectedTimeframe]);

  function pointerToSlot(clientY: number, dayIndex: number): number | null {
    const column = columnRefs.current[dayIndex];
    if (!column) {
      return null;
    }

    const rect = column.getBoundingClientRect();
    const y = clientY - rect.top;
    const slot = Math.floor(y / SLOT_HEIGHT_PX);
    return Math.max(0, Math.min(SLOTS_PER_DAY - 1, slot));
  }

  async function persistTimeframe(
    id: string | null,
    startsAt: Date,
    endsAt: Date,
    notes?: string | null,
  ) {
    setSaving(true);
    setError(null);

    const payload = {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      notes: notes ?? undefined,
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
      const startsAt = slotToDate(weekStart, active.dayIndex, startSlot);
      const endsAt = slotToDate(weekStart, active.dayIndex, endSlot);
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
        Math.min(SLOTS_PER_DAY - active.durationSlots, active.currentSlot - active.grabOffsetSlots),
      );
      const existingPosition = timeframeToSlots(existing, weekStart);
      if (
        existingPosition &&
        existingPosition.dayIndex === active.dayIndex &&
        existingPosition.startSlot === startSlot
      ) {
        return;
      }
      const startsAt = slotToDate(weekStart, active.dayIndex, startSlot);
      const endsAt = addMinutes(startsAt, active.durationSlots * SLOT_MINUTES);
      await persistTimeframe(active.id, startsAt, endsAt, existing.notes);
      return;
    }

    if (active.type === "resize-start") {
      const [startSlot] = normalizeSlotRange(active.currentSlot, active.endSlot - 1);
      const startsAt = slotToDate(weekStart, active.dayIndex, startSlot);
      const endsAt = new Date(existing.endsAt);
      await persistTimeframe(active.id, startsAt, endsAt, existing.notes);
      return;
    }

    const [, endSlot] = normalizeSlotRange(active.startSlot, active.currentSlot);
    const startsAt = new Date(existing.startsAt);
    const endsAt = slotToDate(weekStart, active.dayIndex, endSlot);
    await persistTimeframe(active.id, startsAt, endsAt, existing.notes);
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

    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);

    return () => {
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
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

  async function deleteSelected() {
    if (!selectedId) {
      return;
    }

    if (!window.confirm("Delete this unavailability period?")) {
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/unavailability/${selectedId}`, {
      method: "DELETE",
    });

    setSaving(false);

    if (!response.ok) {
      setError("Unable to delete unavailability.");
      return;
    }

    setTimeframes((current) => current.filter((entry) => entry.id !== selectedId));
    setSelectedId(null);
  }

  async function saveNotes() {
    if (!selectedTimeframe) {
      return;
    }

    await persistTimeframe(
      selectedTimeframe.id,
      new Date(selectedTimeframe.startsAt),
      new Date(selectedTimeframe.endsAt),
      notesDraft.trim() || null,
    );
  }

  const draftBlocks = useMemo(() => {
    if (!interaction) {
      return [];
    }

    if (interaction.type === "create") {
      const style = blockStyle(interaction.anchorSlot, interaction.currentSlot + 1);
      return [{ dayIndex: interaction.dayIndex, ...style, draft: true }];
    }

    const existing = timeframes.find((entry) => entry.id === interaction.id);
    if (!existing) {
      return [];
    }

    const position = timeframeToSlots(existing, weekStart);
    if (!position) {
      return [];
    }

    if (interaction.type === "move") {
      const startSlot = Math.max(
        0,
        Math.min(
          SLOTS_PER_DAY - interaction.durationSlots,
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
  }, [interaction, timeframes, weekStart]);

  const periodLabel = `${format(weekDays[0], "d MMM")} – ${format(weekDays[6], "d MMM yyyy")}`;

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Week view</h2>
            <p className="mt-1 text-sm text-stone-500">
              Click and drag on the grid to add periods. Drag blocks to move, or resize from the
              edges. On a phone, swipe sideways to see the full week.
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

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
              <div className="relative" style={{ height: GRID_HEIGHT_PX }}>
                {Array.from({ length: SLOTS_PER_DAY }, (_, slotIndex) =>
                  slotIndex % 2 === 0 ? (
                    <div
                      key={slotIndex}
                      className="absolute right-2 -translate-y-1/2 text-xs text-stone-400"
                      style={{ top: slotIndex * SLOT_HEIGHT_PX }}
                    >
                      {format(
                        slotToDate(weekStart, 0, slotIndex),
                        "HH:mm",
                      )}
                    </div>
                  ) : null,
                )}
              </div>

              {weekDays.map((day, dayIndex) => {
                const dayBlocks = timeframes
                  .map((entry) => ({ entry, position: timeframeToSlots(entry, weekStart) }))
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
                    className="relative touch-none border-l border-stone-200 bg-white"
                    style={{ height: GRID_HEIGHT_PX }}
                    onPointerDown={(event) => {
                      if (event.button !== 0 || interaction) {
                        return;
                      }
                      if ((event.target as HTMLElement).closest("[data-block]")) {
                        return;
                      }
                      event.preventDefault();
                      const slot = pointerToSlot(event.clientY, dayIndex);
                      if (slot !== null) {
                        startCreate(dayIndex, slot);
                      }
                    }}
                  >
                    {Array.from({ length: SLOTS_PER_DAY }, (_, slotIndex) => (
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
                            if (event.button !== 0) {
                              return;
                            }
                            event.preventDefault();
                            const target = event.target as HTMLElement;
                            if (target.dataset.handle === "start") {
                              setSelectedId(entry.id);
                              setInteraction({
                                type: "resize-start",
                                id: entry.id,
                                dayIndex,
                                endSlot: position.endSlot,
                                currentSlot: position.startSlot,
                              });
                              return;
                            }
                            if (target.dataset.handle === "end") {
                              setSelectedId(entry.id);
                              setInteraction({
                                type: "resize-end",
                                id: entry.id,
                                dayIndex,
                                startSlot: position.startSlot,
                                currentSlot: position.endSlot,
                              });
                              return;
                            }
                            const slot = pointerToSlot(event.clientY, dayIndex);
                            if (slot === null) {
                              return;
                            }
                            startMove(
                              entry.id,
                              dayIndex,
                              slot,
                              position.startSlot,
                              durationSlots,
                            );
                          }}
                        >
                          <div
                            data-handle="start"
                            className="absolute inset-x-0 top-0 cursor-ns-resize bg-red-400/40"
                            style={{ height: RESIZE_HANDLE_PX }}
                          />
                          <div className="pointer-events-none px-2 py-1">
                            <p className="font-medium">
                              {formatTime(new Date(entry.startsAt))} –{" "}
                              {formatTime(new Date(entry.endsAt))}
                            </p>
                            {entry.notes && (
                              <p className="mt-0.5 line-clamp-2 opacity-80">{entry.notes}</p>
                            )}
                          </div>
                          <div
                            data-handle="end"
                            className="absolute inset-x-0 bottom-0 cursor-ns-resize bg-red-400/40"
                            style={{ height: RESIZE_HANDLE_PX }}
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
        <Card>
          <h3 className="mb-3 text-lg font-semibold">Selected period</h3>
          <p className="text-sm text-stone-600">
            {formatDateTime(new Date(selectedTimeframe.startsAt))} –{" "}
            {formatDateTime(new Date(selectedTimeframe.endsAt))}
          </p>
          <div className="mt-4">
            <Label htmlFor="unavailability-notes">Notes (optional)</Label>
            <Textarea
              id="unavailability-notes"
              value={notesDraft}
              onChange={(event) => setNotesDraft(event.target.value)}
              rows={3}
              placeholder="Holiday, work, etc."
              className="mt-1"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" disabled={saving} onClick={() => void saveNotes()}>
              {saving ? "Saving…" : "Save notes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void deleteSelected()}
            >
              Delete period
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
