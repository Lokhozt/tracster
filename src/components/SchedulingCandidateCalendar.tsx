import { format } from "date-fns";
import { formatTime } from "@/lib/datetime";
import { parseDayKey } from "@/lib/scheduling/intervals";
import type { SchedulePlacement } from "@/lib/scheduling/types";
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
}: {
  placements: SchedulePlacement[];
}) {
  if (placements.length === 0) {
    return <p className="text-sm text-stone-600">This candidate has no rehearsals.</p>;
  }

  const uniqueDays = [
    ...new Set(placements.map((placement) => format(new Date(placement.startsAt), "yyyy-MM-dd"))),
  ].sort();
  const locations = [...new Map(placements.map((placement) => [placement.locationId, placement.locationName])).entries()];

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

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-6">
        {uniqueDays.map((day) => (
          <div key={day} className="min-w-[220px] flex-1">
            <p className="mb-2 text-sm font-semibold text-stone-800">
              {format(parseDayKey(day), "EEEE d MMM")}
            </p>
            <div className="flex gap-2">
              {locations.map(([locationId, locationName]) => {
                const columnPlacements = placements.filter(
                  (placement) =>
                    placement.locationId === locationId &&
                    format(new Date(placement.startsAt), "yyyy-MM-dd") === day,
                );

                return (
                  <div key={`${day}-${locationId}`} className="min-w-[140px] flex-1">
                    <p className="mb-1 truncate text-xs font-medium text-stone-500">{locationName}</p>
                    <div
                      className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50"
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
                        const start = new Date(placement.startsAt);
                        const end = new Date(placement.endsAt);
                        const top =
                          (start.getHours() * 60 + start.getMinutes() - startMinutes) * PX_PER_MINUTE;
                        const blockHeight = Math.max(
                          28,
                          ((end.getTime() - start.getTime()) / 60000) * PX_PER_MINUTE,
                        );
                        const tone = rehearsalTone(`${placement.choreographyId}:${placement.groupId ?? ""}`);

                        return (
                          <div
                            key={`${placement.itemId}-${placement.startsAt}`}
                            className="absolute right-1 left-1 overflow-hidden rounded-md border px-1.5 py-1 text-xs leading-tight shadow-sm"
                            style={{
                              top,
                              height: blockHeight,
                              background: tone.background,
                              borderColor: tone.border,
                              color: tone.color,
                            }}
                            title={`${placementLabel(placement)} ${formatTime(start)} → ${formatTime(end)}`}
                          >
                            <p className={cn("font-semibold", blockHeight < 40 && "truncate")}>
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
