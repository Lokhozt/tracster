
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/datetime";
import { atLocalTime, mergeIntervals, parseDayKey } from "@/lib/scheduling/intervals";
import type {
  IntervalMs,
  LocationUnavailability,
  SchedulePlacement,
  SchedulingAvailabilityBand,
  SchedulingPlacementConflicts,
} from "@/lib/scheduling/types";
import { withSchedulingTooltip } from "@/lib/schedule-filters";
import {
  placementDurationMs,
  swapConflictPreviewSides,
  type SwapPreviewSide,
  swappedPlacements,
} from "@/lib/scheduling/swap-placements";
import { cn } from "@/lib/utils";

type SwapTooltipPreview =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; selected: SwapPreviewSide; hovered: SwapPreviewSide };

function SwapArrowsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5 shrink-0 text-stone-500", className)}
      aria-hidden="true"
    >
      <path d="M7 7h11" />
      <path d="m13 3 4 4-4 4" />
      <path d="M17 17H6" />
      <path d="m11 21-4-4 4-4" />
    </svg>
  );
}

function SwapPreviewTooltipColumn({
  side,
  noConflictsLabel,
}: {
  side: SwapPreviewSide;
  noConflictsLabel: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-semibold leading-snug text-stone-900">{side.title}</p>
      {side.constraints.length === 0 ? (
        <p className="mt-1 text-stone-500">{noConflictsLabel}</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-stone-600">
          {side.constraints.map((line) => (
            <li key={line} className="leading-snug">{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SwapPreviewTooltip({
  preview,
  anchorRect,
  loadingLabel,
  noConflictsLabel,
}: {
  preview: SwapTooltipPreview;
  anchorRect: DOMRect;
  loadingLabel: string;
  noConflictsLabel: string;
}) {
  const width = 380;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[100] rounded-md border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-800 shadow-lg"
      style={{
        top: anchorRect.top,
        left: Math.min(anchorRect.right + 8, window.innerWidth - width - 8),
        width,
      }}
    >
      {preview.status === "loading" && <p className="text-stone-500">{loadingLabel}</p>}
      {preview.status === "error" && <p className="text-red-700">{preview.message}</p>}
      {preview.status === "ready" && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <SwapPreviewTooltipColumn side={preview.selected} noConflictsLabel={noConflictsLabel} />
          <SwapArrowsIcon className="self-center" />
          <SwapPreviewTooltipColumn side={preview.hovered} noConflictsLabel={noConflictsLabel} />
        </div>
      )}
    </div>
  );
}

const PX_PER_MINUTE = 1.1;
const EDIT_SNAP_MINUTES = 10;
const CLICK_MOVE_PX = 6;

type EditDrag = {
  itemId: string;
  pointerId: number;
  /** Where inside the block it was grabbed, so it does not jump under the cursor. */
  grabOffsetMinutes: number;
  durationMinutes: number;
  day: string;
  locationId: string;
  offsetMinutes: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
};

function columnKey(day: string, locationId: string) {
  return `${day}|${locationId}`;
}

export function rehearsalTone(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = key.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `hsl(${hue} 72% 88%)`,
    border: `hsl(${hue} 48% 52%)`,
    color: `hsl(${hue} 35% 22%)`,
  };
}

function placementLabel(placement: SchedulePlacement) {
  if (placement.groupName) {
    return `${placement.choreographyTitle} · ${placement.groupName}`;
  }
  return placement.choreographyTitle;
}

function placementHasUser(
  ids: string[] | undefined,
  names: string[] | undefined,
  userId: string | undefined,
  userName: string | undefined,
) {
  if (userId && ids?.includes(userId)) {
    return true;
  }
  return Boolean(userName && names?.includes(userName));
}

function CrownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-amber-500"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3.5 16.5 5 8l4.2 4.2L12 5.5l2.8 6.7L19 8l1.5 8.5H3.5ZM5 18.5h14v2H5v-2Z" />
    </svg>
  );
}

function ParticipantDot() {
  return (
    <span className="mt-0.5 inline-block size-2 shrink-0 rounded-full bg-emerald-500 ring-1 ring-white" />
  );
}

function overlayIntervals(
  entries: Array<{ startsAt: string; endsAt: string }>,
  day: string,
  minHour: number,
  maxHour: number,
): Array<{ top: number; height: number; start: Date; end: Date }> {
  const visStart = atLocalTime(parseDayKey(day), minHour).getTime();
  const visEnd = atLocalTime(parseDayKey(day), maxHour).getTime();
  const pieces: IntervalMs[] = [];
  for (const entry of entries) {
    const start = Math.max(new Date(entry.startsAt).getTime(), visStart);
    const end = Math.min(new Date(entry.endsAt).getTime(), visEnd);
    if (end > start) {
      pieces.push({ start, end });
    }
  }
  return mergeIntervals(pieces).map((interval) => ({
    top: ((interval.start - visStart) / 60_000) * PX_PER_MINUTE,
    height: Math.max(2, ((interval.end - interval.start) / 60_000) * PX_PER_MINUTE),
    start: new Date(interval.start),
    end: new Date(interval.end),
  }));
}

function availabilityBandClass(band: SchedulingAvailabilityBand) {
  if (band.allChoreographersUnavailable) {
    return "bg-red-900/65";
  }
  if (band.unavailableParticipants >= 3) {
    return "bg-orange-400/55";
  }
  if (band.unavailableParticipants === 2) {
    return "bg-yellow-300/60";
  }
  if (band.unavailableParticipants === 1) {
    return "bg-green-400/50";
  }
  return "bg-blue-300/45";
}

export function SchedulingCandidateCalendar({
  placements,
  editable = false,
  days,
  locations,
  conflicts = {},
  unavailability = [],
  locationUnavailability = [],
  availabilityHeatmap = [],
  selectedItemId,
  highlightUserId,
  highlightUserName,
  onMove,
  onSelect,
  onClearSelection,
  onSwap,
  excludeRehearsalIds,
}: {
  placements: SchedulePlacement[];
  editable?: boolean;
  days?: string[];
  locations?: Array<{ id: string; name: string }>;
  conflicts?: SchedulingPlacementConflicts;
  unavailability?: Array<{ startsAt: string; endsAt: string }>;
  locationUnavailability?: Array<Pick<LocationUnavailability, "locationId" | "day" | "startsAt" | "endsAt">>;
  availabilityHeatmap?: SchedulingAvailabilityBand[];
  selectedItemId?: string;
  highlightUserId?: string;
  highlightUserName?: string;
  onMove?: (itemId: string, locationId: string, startsAt: Date, endsAt: Date) => void;
  onSelect?: (itemId: string) => void;
  onClearSelection?: () => void;
  onSwap?: (selectedItemId: string, targetItemId: string) => void;
  excludeRehearsalIds?: string[];
}) {
  const t = useTranslations("Components");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const [drag, setDrag] = useState<EditDrag | null>(null);
  const [shiftKeyDown, setShiftKeyDown] = useState(false);
  const [swapHoverItemId, setSwapHoverItemId] = useState<string | null>(null);
  const [swapTooltipPreview, setSwapTooltipPreview] = useState<SwapTooltipPreview | null>(null);
  const [swapTooltipRect, setSwapTooltipRect] = useState<DOMRect | null>(null);
  const columnRefs = useRef(new Map<string, HTMLDivElement>());
  const swapPreviewRequest = useRef(0);
  const pointerOverPlacementRef = useRef<{ itemId: string; rect: DOMRect } | null>(null);

  const uniqueDays = days ?? [
    ...new Set(placements.map((placement) => format(new Date(placement.startsAt), "yyyy-MM-dd"))),
  ].sort();
  const calendarLocations = locations?.map((location) => [location.id, location.name] as const) ??
    [...new Map(
      placements.map((placement) => [placement.locationId, placement.locationName]),
    ).entries()];

  let minHour = 8;
  let maxHour = 22;
  for (const placement of placements) {
    const start = new Date(placement.startsAt);
    const end = new Date(placement.endsAt);
    minHour = Math.min(minHour, start.getHours());
    maxHour = Math.max(maxHour, end.getHours() + (end.getMinutes() > 0 ? 1 : 0));
  }
  for (const entry of locationUnavailability) {
    const start = new Date(entry.startsAt);
    const end = new Date(entry.endsAt);
    minHour = Math.min(minHour, start.getHours());
    maxHour = Math.max(maxHour, end.getHours() + (end.getMinutes() > 0 ? 1 : 0));
  }
  const startMinutes = minHour * 60;
  const totalMinutes = Math.max(60, maxHour * 60 - startMinutes);
  const height = totalMinutes * PX_PER_MINUTE;

  function offsetToDate(day: string, offsetMinutes: number) {
    return new Date(atLocalTime(parseDayKey(day), minHour).getTime() + offsetMinutes * 60_000);
  }

  /** Where a placement sits right now, which during a drag is the previewed spot. */
  function livePlacement(placement: SchedulePlacement) {
    if (!drag || drag.itemId !== placement.itemId) {
      const start = new Date(placement.startsAt);
      return {
        day: format(start, "yyyy-MM-dd"),
        locationId: placement.locationId,
        start,
        end: new Date(placement.endsAt),
      };
    }

    const start = offsetToDate(drag.day, drag.offsetMinutes);
    return {
      day: drag.day,
      locationId: drag.locationId,
      start,
      end: new Date(start.getTime() + drag.durationMinutes * 60_000),
    };
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>, placement: SchedulePlacement) {
    if (!editable || (!onMove && !onSelect) || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const start = new Date(placement.startsAt);
    const day = format(start, "yyyy-MM-dd");
    const column = columnRefs.current.get(columnKey(day, placement.locationId));
    if (!column) {
      return;
    }

    event.preventDefault();
    const startOffset = start.getHours() * 60 + start.getMinutes() - startMinutes;
    const pointerMinutes =
      (event.clientY - column.getBoundingClientRect().top) / PX_PER_MINUTE;

    setDrag({
      itemId: placement.itemId,
      pointerId: event.pointerId,
      grabOffsetMinutes: pointerMinutes - startOffset,
      durationMinutes: (new Date(placement.endsAt).getTime() - start.getTime()) / 60_000,
      day,
      locationId: placement.locationId,
      offsetMinutes: startOffset,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    });
  }

  /** The column under the cursor, so a rehearsal can cross days and locations mid-drag. */
  function columnAt(clientX: number) {
    for (const [key, element] of columnRefs.current) {
      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        const [day, locationId] = key.split("|");
        return { day, locationId, rect };
      }
    }
    return null;
  }

  const syncSwapHoverFromPointer = useCallback(
    (shiftActive: boolean) => {
      if (!editable || !selectedItemId || !shiftActive) {
        return;
      }
      const over = pointerOverPlacementRef.current;
      if (!over || over.itemId === selectedItemId) {
        setSwapHoverItemId(null);
        setSwapTooltipPreview(null);
        setSwapTooltipRect(null);
        return;
      }
      const selected = placements.find((placement) => placement.itemId === selectedItemId);
      const hovered = placements.find((placement) => placement.itemId === over.itemId);
      if (!selected || !hovered) {
        return;
      }
      if (placementDurationMs(selected) !== placementDurationMs(hovered)) {
        setSwapHoverItemId(null);
        setSwapTooltipPreview(null);
        setSwapTooltipRect(null);
        return;
      }
      setSwapHoverItemId(over.itemId);
      setSwapTooltipRect(over.rect);
    },
    [editable, placements, selectedItemId],
  );

  useEffect(() => {
    if (!selectedItemId) {
      setSwapHoverItemId(null);
      setSwapTooltipPreview(null);
      setSwapTooltipRect(null);
      return;
    }
    syncSwapHoverFromPointer(shiftKeyDown);
  }, [selectedItemId, shiftKeyDown, syncSwapHoverFromPointer]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Shift") {
        return;
      }
      setShiftKeyDown(true);
      syncSwapHoverFromPointer(true);
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.key !== "Shift") {
        return;
      }
      setShiftKeyDown(false);
      setSwapHoverItemId(null);
      setSwapTooltipPreview(null);
      setSwapTooltipRect(null);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [syncSwapHoverFromPointer]);

  useEffect(() => {
    if (!editable || !selectedItemId || !swapHoverItemId || !shiftKeyDown) {
      setSwapTooltipPreview(null);
      return;
    }

    const selected = placements.find((placement) => placement.itemId === selectedItemId);
    const hovered = placements.find((placement) => placement.itemId === swapHoverItemId);
    const swapped = selected && hovered
      ? swappedPlacements(placements, selected.itemId, hovered.itemId)
      : null;
    if (!selected || !hovered || !swapped) {
      setSwapTooltipPreview(null);
      return;
    }

    const requestId = swapPreviewRequest.current + 1;
    swapPreviewRequest.current = requestId;
    setSwapTooltipPreview({ status: "loading" });

    fetch("/api/scheduling/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        days: uniqueDays,
        excludeRehearsalIds,
        placements: swapped.map((placement) => ({
          itemId: placement.itemId,
          choreographyId: placement.choreographyId,
          groupId: placement.groupId,
          startsAt: placement.startsAt,
          endsAt: placement.endsAt,
        })),
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "CONFLICT_CHECK_FAILED");
        }
        if (requestId !== swapPreviewRequest.current) {
          return;
        }
        setSwapTooltipPreview({
          status: "ready",
          ...swapConflictPreviewSides(data.conflicts, selected, hovered, (key, values) =>
            t(key as "scheduleChoreographerUnavailable", values),
          ),
        });
      })
      .catch(() => {
        if (requestId === swapPreviewRequest.current) {
          setSwapTooltipPreview({
            status: "error",
            message: t("scheduleConflictCheckError"),
          });
        }
      });
  }, [
    editable,
    excludeRehearsalIds,
    placements,
    selectedItemId,
    shiftKeyDown,
    swapHoverItemId,
    t,
    uniqueDays,
  ]);

  function handlePlacementPointerEnter(
    event: React.PointerEvent<HTMLDivElement>,
    placement: SchedulePlacement,
  ) {
    if (!editable) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    pointerOverPlacementRef.current = { itemId: placement.itemId, rect };
    const shiftActive = shiftKeyDown || event.shiftKey;
    if (event.shiftKey && !shiftKeyDown) {
      setShiftKeyDown(true);
    }
    syncSwapHoverFromPointer(shiftActive);
  }

  function handlePlacementPointerMove(
    event: React.PointerEvent<HTMLDivElement>,
    placement: SchedulePlacement,
  ) {
    if (!editable) {
      return;
    }
    pointerOverPlacementRef.current = {
      itemId: placement.itemId,
      rect: event.currentTarget.getBoundingClientRect(),
    };
    if (swapHoverItemId === placement.itemId) {
      setSwapTooltipRect(event.currentTarget.getBoundingClientRect());
    }
  }

  function handlePlacementPointerLeave(placement: SchedulePlacement) {
    if (pointerOverPlacementRef.current?.itemId === placement.itemId) {
      pointerOverPlacementRef.current = null;
    }
    if (swapHoverItemId !== placement.itemId) {
      return;
    }
    setSwapHoverItemId(null);
    setSwapTooltipPreview(null);
    setSwapTooltipRect(null);
  }

  function trySwapWithSelected(targetItemId: string): boolean {
    if (!editable || !onSwap || !selectedItemId || targetItemId === selectedItemId) {
      return false;
    }
    const selected = placements.find((entry) => entry.itemId === selectedItemId);
    const target = placements.find((entry) => entry.itemId === targetItemId);
    if (!selected || !target) {
      return false;
    }
    if (placementDurationMs(selected) !== placementDurationMs(target)) {
      return false;
    }
    onSwap(selectedItemId, targetItemId);
    setSwapHoverItemId(null);
    setSwapTooltipPreview(null);
    setSwapTooltipRect(null);
    return true;
  }

  function handleColumnBackgroundPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!editable || !onClearSelection) {
      return;
    }
    if ((event.target as HTMLElement).closest("[data-scheduling-placement]")) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    onClearSelection();
  }

  function commitDrag(active: EditDrag) {
    const placement = placements.find((entry) => entry.itemId === active.itemId);
    if (!active.moved || !placement || !onMove) {
      return;
    }

    const startsAt = offsetToDate(active.day, active.offsetMinutes);
    const unchanged =
      placement.locationId === active.locationId &&
      new Date(placement.startsAt).getTime() === startsAt.getTime();
    if (unchanged) {
      return;
    }

    onMove(
      active.itemId,
      active.locationId,
      startsAt,
      new Date(startsAt.getTime() + active.durationMinutes * 60_000),
    );
  }

  // Listeners live on the window so the pointer can leave the column mid-drag, and they
  // are rebound every render so they always read the current drag state.
  useEffect(() => {
    if (!drag) {
      return;
    }

    const active = drag;

    function onPointerMove(event: PointerEvent) {
      if (event.pointerId !== active.pointerId) {
        return;
      }

      const column = columnAt(event.clientX);
      const rect =
        column?.rect ??
        columnRefs.current.get(columnKey(active.day, active.locationId))?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const rawMinutes =
        (event.clientY - rect.top) / PX_PER_MINUTE - active.grabOffsetMinutes;
      const snapped = Math.round(rawMinutes / EDIT_SNAP_MINUTES) * EDIT_SNAP_MINUTES;
      const offsetMinutes = Math.max(
        0,
        Math.min(totalMinutes - active.durationMinutes, snapped),
      );
      const nextDay = column?.day ?? active.day;
      const nextLocationId = column?.locationId ?? active.locationId;
      const moved =
        active.moved ||
        Math.hypot(event.clientX - active.startClientX, event.clientY - active.startClientY) >=
          CLICK_MOVE_PX ||
        nextDay !== active.day ||
        nextLocationId !== active.locationId ||
        offsetMinutes !== active.offsetMinutes;

      setDrag((current) =>
        current
          ? {
              ...current,
              day: nextDay,
              locationId: nextLocationId,
              offsetMinutes,
              moved,
            }
          : current,
      );
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerId !== active.pointerId) {
        return;
      }
      setDrag(null);
      if (!active.moved) {
        if (event.shiftKey) {
          if (trySwapWithSelected(active.itemId)) {
            return;
          }
          if (selectedItemId && active.itemId !== selectedItemId) {
            return;
          }
        }
        onSelect?.(active.itemId);
        return;
      }
      commitDrag(active);
    }

    function onPointerCancel() {
      setDrag(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  });

  if (placements.length === 0 && calendarLocations.length === 0) {
    return <p className="text-sm text-stone-600">{t("candidateNoRehearsals")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      {swapTooltipPreview && swapTooltipRect && (
        <SwapPreviewTooltip
          preview={swapTooltipPreview}
          anchorRect={swapTooltipRect}
          loadingLabel={t("swapPreviewLoading")}
          noConflictsLabel={t("swapPreviewNoConflicts")}
        />
      )}
      <div className="inline-flex min-w-full gap-6">
        {uniqueDays.map((day) => (
          <div key={day} className="min-w-[220px] flex-1">
            <p className="mb-2 text-sm font-semibold text-stone-800">
              {format(parseDayKey(day), "EEEE d MMM", {locale: dateLocale})}
            </p>
            <div className="flex gap-2">
              {calendarLocations.map(([locationId, locationName]) => {
                const columnPlacements = placements.filter((placement) => {
                  const live = livePlacement(placement);
                  return live.locationId === locationId && live.day === day;
                });

                return (
                  <div key={`${day}-${locationId}`} className="min-w-[140px] flex-1">
                    <p className="mb-1 truncate text-xs font-medium text-stone-500">{locationName}</p>
                    <div
                      ref={(node) => {
                        const key = columnKey(day, locationId);
                        if (node) {
                          columnRefs.current.set(key, node);
                        } else {
                          columnRefs.current.delete(key);
                        }
                      }}
                      className={cn(
                        "relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50",
                        editable && "transition-colors",
                        drag && drag.locationId === locationId && drag.day === day && "bg-stone-100",
                      )}
                      style={{ height }}
                      onPointerDown={handleColumnBackgroundPointerDown}
                    >
                      {availabilityHeatmap
                        .filter((band) => band.day === day)
                        .map((band, index) => {
                          const start = new Date(band.startsAt);
                          const end = new Date(band.endsAt);
                          const top =
                            (start.getHours() * 60 + start.getMinutes() - startMinutes) *
                            PX_PER_MINUTE;
                          const bandHeight =
                            ((end.getTime() - start.getTime()) / 60_000) * PX_PER_MINUTE;
                          return (
                            <div
                              key={`${day}-${locationId}-availability-${index}`}
                              className={cn(
                                "pointer-events-none absolute right-0 left-0 border-b border-white/25",
                                availabilityBandClass(band),
                              )}
                              style={{ top, height: bandHeight }}
                              title={t("choreographyAvailabilityTooltip", {
                                participants: band.unavailableParticipants,
                                choreographers: band.unavailableChoreographers,
                              })}
                              aria-hidden
                            />
                          );
                        })}
                      {overlayIntervals(
                        locationUnavailability.filter(
                          (entry) => entry.locationId === locationId && entry.day === day,
                        ),
                        day,
                        minHour,
                        maxHour,
                      ).map((band, index) => (
                        <div
                          key={`${day}-${locationId}-closed-${index}`}
                          className="pointer-events-none absolute right-1 left-1 z-[2] overflow-hidden rounded-md border border-stone-400 bg-stone-300 px-1.5 py-1 text-xs leading-tight text-stone-600"
                          style={{ top: band.top, height: band.height }}
                          aria-label={t("locationUnavailableBlock")}
                          title={`${t("locationUnavailableBlock")}\n${formatTime(band.start)} → ${formatTime(band.end)}`}
                        >
                          <p className="font-semibold">{t("locationUnavailableBlock")}</p>
                        </div>
                      ))}
                      {overlayIntervals(unavailability, day, minHour, maxHour).map((band, index) => (
                        <div
                          key={`${day}-${locationId}-busy-${index}`}
                          className="pointer-events-none absolute right-0 left-0 z-[1] bg-red-400/45"
                          style={{ top: band.top, height: band.height }}
                          aria-hidden
                        />
                      ))}
                      {Array.from({ length: maxHour - minHour + 1 }, (_, index) => minHour + index).map((hour) => (
                        <div
                          key={hour}
                          className="pointer-events-none absolute right-0 left-0 z-[1] border-t border-stone-200/80 text-[10px] text-stone-400"
                          style={{ top: (hour * 60 - startMinutes) * PX_PER_MINUTE }}
                        >
                          <span className="pl-1">{String(hour).padStart(2, "0")}:00</span>
                        </div>
                      ))}
                      {columnPlacements.map((placement) => {
                        const { start, end } = livePlacement(placement);
                        const dragging = drag?.itemId === placement.itemId;
                        const top =
                          (start.getHours() * 60 + start.getMinutes() - startMinutes) * PX_PER_MINUTE;
                        const blockHeight = Math.max(
                          28,
                          ((end.getTime() - start.getTime()) / 60000) * PX_PER_MINUTE,
                        );
                        const tone = rehearsalTone(`${placement.choreographyId}:${placement.groupId ?? ""}`);
                        const conflict = conflicts[placement.itemId];
                        const hasConflict = Boolean(
                          conflict &&
                          (conflict.unavailable.length > 0 ||
                            conflict.engaged.length > 0 ||
                            (conflict.choreographerUnavailable?.length ?? 0) > 0),
                        );

                        const isChoreographer = placementHasUser(
                          placement.choreographerIds,
                          placement.choreographerNames,
                          highlightUserId,
                          highlightUserName,
                        );
                        const isParticipant = placementHasUser(
                          placement.participantIds,
                          placement.participantNames,
                          highlightUserId,
                          highlightUserName,
                        );

                        const selected = selectedItemId === placement.itemId;
                        return (
                          <div
                            key={placement.itemId}
                            data-scheduling-placement
                            onPointerDown={(event) => startDrag(event, placement)}
                            onPointerEnter={(event) => handlePlacementPointerEnter(event, placement)}
                            onPointerMove={(event) => handlePlacementPointerMove(event, placement)}
                            onPointerLeave={() => handlePlacementPointerLeave(placement)}
                            className={cn(
                              "absolute right-1 left-1 z-[2] overflow-hidden rounded-md border px-1.5 py-1 text-xs leading-tight shadow-sm",
                              editable && "cursor-grab touch-none select-none active:cursor-grabbing",
                              hasConflict && "ring-2 ring-red-600",
                              selected && "z-[3] ring-2 ring-stone-900",
                              dragging && "z-10 cursor-grabbing shadow-lg ring-2 ring-stone-700",
                            )}
                            style={{
                              top,
                              height: blockHeight,
                              background: tone.background,
                              borderColor: tone.border,
                              color: tone.color,
                            }}
                            title={
                              shiftKeyDown && editable && selectedItemId
                                ? undefined
                                : withSchedulingTooltip(
                                    `${placementLabel(placement)}\n${formatTime(start)} → ${formatTime(end)}`,
                                    {
                                      choreographerNames: placement.choreographerNames ?? [],
                                      participantNames: placement.participantNames,
                                      unavailableNames: conflict?.unavailable ?? [],
                                      engagedNames: conflict?.engaged ?? [],
                                    },
                                    t,
                                  )
                            }
                          >
                            {(isChoreographer || isParticipant || hasConflict) && (
                              <span className="float-right ml-1 inline-flex items-center gap-0.5">
                                {isChoreographer ? (
                                  <span aria-label={t("highlightUserChoreographer")}>
                                    <CrownIcon />
                                  </span>
                                ) : isParticipant ? (
                                  <span aria-label={t("highlightUserParticipant")}>
                                    <ParticipantDot />
                                  </span>
                                ) : null}
                                {hasConflict && (
                                  <span
                                    className="font-bold text-red-700"
                                    aria-label={t("schedulingConflict")}
                                  >
                                    !
                                  </span>
                                )}
                              </span>
                            )}
                            <p className={cn("font-semibold break-words", blockHeight < 60 && "line-clamp-2")}>
                              {placementLabel(placement)}
                            </p>
                            <p>
                              {formatTime(start)}→{formatTime(end)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
