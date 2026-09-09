
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/datetime";
import { atLocalTime, parseDayKey } from "@/lib/scheduling/intervals";
import type {
  SchedulePlacement,
  SchedulingPlacementConflicts,
} from "@/lib/scheduling/types";
import { withParticipantTooltip } from "@/lib/schedule-filters";
import { cn } from "@/lib/utils";

const PX_PER_MINUTE = 1.1;
const EDIT_SNAP_MINUTES = 10;

type EditDrag = {
  itemId: string;
  pointerId: number;
  /** Where inside the block it was grabbed, so it does not jump under the cursor. */
  grabOffsetMinutes: number;
  durationMinutes: number;
  day: string;
  locationId: string;
  offsetMinutes: number;
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

export function SchedulingCandidateCalendar({
  placements,
  editable = false,
  days,
  locations,
  conflicts = {},
  onMove,
}: {
  placements: SchedulePlacement[];
  editable?: boolean;
  days?: string[];
  locations?: Array<{ id: string; name: string }>;
  conflicts?: SchedulingPlacementConflicts;
  onMove?: (itemId: string, locationId: string, startsAt: Date, endsAt: Date) => void;
}) {
  const t = useTranslations("Components");
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : enUS;
  const [drag, setDrag] = useState<EditDrag | null>(null);
  const columnRefs = useRef(new Map<string, HTMLDivElement>());

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
    if (!editable || !onMove || (event.pointerType === "mouse" && event.button !== 0)) {
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

      setDrag((current) =>
        current
          ? {
              ...current,
              day: column?.day ?? current.day,
              locationId: column?.locationId ?? current.locationId,
              offsetMinutes: Math.max(
                0,
                Math.min(totalMinutes - active.durationMinutes, snapped),
              ),
              moved: true,
            }
          : current,
      );
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerId !== active.pointerId) {
        return;
      }
      setDrag(null);
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

  if (placements.length === 0) {
    return <p className="text-sm text-stone-600">{t("candidateNoRehearsals")}</p>;
  }

  return (
    <div className="overflow-x-auto">
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
                    >
                      {Array.from({ length: maxHour - minHour + 1 }, (_, index) => minHour + index).map((hour) => (
                        <div
                          key={hour}
                          className="absolute right-0 left-0 border-t border-stone-200/80 text-[10px] text-stone-400"
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
                          (conflict.unavailable.length > 0 || conflict.engaged.length > 0),
                        );

                        return (
                          <div
                            key={placement.itemId}
                            onPointerDown={(event) => startDrag(event, placement)}
                            className={cn(
                              "absolute right-1 left-1 overflow-hidden rounded-md border px-1.5 py-1 text-xs leading-tight shadow-sm",
                              editable && "cursor-grab touch-none select-none active:cursor-grabbing",
                              hasConflict && "ring-2 ring-red-600",
                              dragging && "z-10 cursor-grabbing shadow-lg ring-2 ring-stone-700",
                            )}
                            style={{
                              top,
                              height: blockHeight,
                              background: tone.background,
                              borderColor: tone.border,
                              color: tone.color,
                            }}
                            title={withParticipantTooltip(
                              `${placementLabel(placement)}\n${formatTime(start)} → ${formatTime(end)}`,
                              placement.participantNames,
                            )}
                          >
                            {hasConflict && (
                              <span
                                className="float-right ml-1 font-bold text-red-700"
                                aria-label={t("schedulingConflict")}
                              >
                                !
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
