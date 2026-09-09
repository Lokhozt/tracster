
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useState, type DragEvent } from "react";
import { formatTime } from "@/lib/datetime";
import { atLocalTime, parseDayKey } from "@/lib/scheduling/intervals";
import type {
  SchedulePlacement,
  SchedulingPlacementConflicts,
} from "@/lib/scheduling/types";
import { withParticipantTooltip } from "@/lib/schedule-filters";
import { cn } from "@/lib/utils";

const PX_PER_MINUTE = 1.1;

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
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  if (placements.length === 0) {
    return <p className="text-sm text-stone-600">{t("candidateNoRehearsals")}</p>;
  }

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

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
    day: string,
    locationId: string,
  ) {
    event.preventDefault();
    const itemId = draggedItemId ?? event.dataTransfer.getData("text/scheduling-item");
    const placement = placements.find((entry) => entry.itemId === itemId);
    if (!placement || !onMove) {
      return;
    }

    const durationMs =
      new Date(placement.endsAt).getTime() - new Date(placement.startsAt).getTime();
    const durationMinutes = durationMs / 60_000;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes = (event.clientY - rect.top) / PX_PER_MINUTE;
    const snappedMinutes = Math.round(rawMinutes / 5) * 5;
    const offsetMinutes = Math.max(
      0,
      Math.min(totalMinutes - durationMinutes, snappedMinutes),
    );
    const dayDate = parseDayKey(day);
    const startsAt = new Date(
      atLocalTime(dayDate, minHour).getTime() + offsetMinutes * 60_000,
    );
    const endsAt = new Date(startsAt.getTime() + durationMs);
    onMove(itemId, locationId, startsAt, endsAt);
    setDraggedItemId(null);
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
                const columnPlacements = placements.filter(
                  (placement) =>
                    placement.locationId === locationId &&
                    format(new Date(placement.startsAt), "yyyy-MM-dd") === day,
                );

                return (
                  <div key={`${day}-${locationId}`} className="min-w-[140px] flex-1">
                    <p className="mb-1 truncate text-xs font-medium text-stone-500">{locationName}</p>
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50",
                        editable && "transition-colors hover:bg-stone-100",
                      )}
                      style={{ height }}
                      onDragOver={editable ? (event) => event.preventDefault() : undefined}
                      onDrop={
                        editable
                          ? (event) => handleDrop(event, day, locationId)
                          : undefined
                      }
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
                        const start = new Date(placement.startsAt);
                        const end = new Date(placement.endsAt);
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
                            key={`${placement.itemId}-${placement.startsAt}`}
                            draggable={editable}
                            onDragStart={(event) => {
                              setDraggedItemId(placement.itemId);
                              event.dataTransfer.setData(
                                "text/scheduling-item",
                                placement.itemId,
                              );
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => setDraggedItemId(null)}
                            className={cn(
                              "absolute right-1 left-1 overflow-hidden rounded-md border px-1.5 py-1 text-xs leading-tight shadow-sm",
                              editable && "cursor-grab active:cursor-grabbing",
                              hasConflict && "ring-2 ring-red-600",
                              draggedItemId === placement.itemId && "opacity-60",
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
