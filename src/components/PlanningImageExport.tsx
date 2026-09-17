"use client";

import {
  addDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  max,
  min,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { rehearsalTone } from "@/components/SchedulingCandidateCalendar";
import { Button, Input, Label } from "@/components/ui";
import { formatTime } from "@/lib/datetime";
import { parseDayKey } from "@/lib/scheduling/intervals";
import type { SchedulePlacement } from "@/lib/scheduling/types";
import {
  scheduleEventLabel,
  type SerializedScheduleEvent,
} from "@/lib/schedule-filters";
import { cn } from "@/lib/utils";

function ExportImageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </svg>
  );
}

type PlanningImageEntry = {
  id: string;
  label: string;
  startsAt: string;
  endsAt: string | null;
  locationKey: string;
  locationName: string;
  colorKey: string;
};

type ImageRange = {
  start: Date;
  end: Date;
};

/** Per-location columns for the scheduling wizard, one column per day for the planning. */
type PlanningImageLayout =
  | { kind: "locationColumns"; locations: Array<{ id: string; name: string }> }
  | { kind: "overlapLanes" };

type DaySegment = {
  entry: PlanningImageEntry;
  start: Date;
  end: Date;
  startMinute: number;
  endMinute: number;
  lane: number;
  lanes: number;
};

const LOCATION_COLUMN_WIDTH = 150;
const DAY_COLUMN_WIDTH = 260;
const TIME_GUTTER = 42;
const PAGE_PADDING = 24;
const HEADER_HEIGHT = 68;
const DAY_HEADER_HEIGHT = 34;
const LOCATION_HEADER_HEIGHT = 26;
const PX_PER_MINUTE = 1;
const MIN_BLOCK_HEIGHT = 28;
const MAX_CANVAS_EDGE = 16_000;

function planningFileName(range: ImageRange) {
  return `planning-${format(range.start, "yyyy-MM-dd")}-${format(range.end, "yyyy-MM-dd")}.png`;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
    if (lines.length === maxLines - 1) {
      break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function entryInterval(entry: PlanningImageEntry) {
  const start = new Date(entry.startsAt);
  const end = entry.endsAt ? new Date(entry.endsAt) : null;
  return {
    start,
    end: end && end > start ? end : new Date(start.getTime() + 60 * 60_000),
  };
}

/**
 * Spreads overlapping events across lanes: every event in a group of mutually
 * overlapping events is drawn side by side on the same fraction of the column.
 */
function assignLanes(segments: DaySegment[]) {
  let group: DaySegment[] = [];
  let laneEnds: number[] = [];

  function closeGroup() {
    for (const segment of group) {
      segment.lanes = Math.max(1, laneEnds.length);
    }
    group = [];
    laneEnds = [];
  }

  for (const segment of segments) {
    if (laneEnds.length > 0 && laneEnds.every((end) => end <= segment.startMinute)) {
      closeGroup();
    }
    let lane = laneEnds.findIndex((end) => end <= segment.startMinute);
    if (lane === -1) {
      lane = laneEnds.length;
    }
    laneEnds[lane] = segment.endMinute;
    segment.lane = lane;
    group.push(segment);
  }
  closeGroup();
}

function daySegments(entries: PlanningImageEntry[], day: Date): DaySegment[] {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const segments = entries
    .map((entry) => ({ entry, ...entryInterval(entry) }))
    .filter(({ start, end }) => start < dayEnd && end > dayStart)
    .map(({ entry, start, end }) => ({
      entry,
      start,
      end,
      startMinute: differenceInMinutes(max([start, dayStart]), dayStart),
      endMinute: differenceInMinutes(min([end, dayEnd]), dayStart),
      lane: 0,
      lanes: 1,
    }))
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

  assignLanes(segments);
  return segments;
}

function drawEventBlock(
  context: CanvasRenderingContext2D,
  {
    x,
    y,
    width,
    height,
    colorKey,
    lines,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    colorKey: string;
    lines: Array<{ text: string; font: string; maxLines: number }>;
  },
) {
  const tone = rehearsalTone(colorKey);
  context.fillStyle = tone.background;
  context.strokeStyle = tone.border;
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y, width, height, 5);
  context.fill();
  context.stroke();

  context.save();
  context.beginPath();
  context.rect(x + 4, y + 3, width - 8, height - 6);
  context.clip();
  context.fillStyle = tone.color;

  let textY = y + 4;
  for (const line of lines) {
    context.font = line.font;
    const wrapped = wrapText(context, line.text, width - 10, line.maxLines);
    for (const text of wrapped) {
      if (textY + 11 > y + height) {
        break;
      }
      context.fillText(text, x + 5, textY);
      textY += 12;
    }
  }
  context.restore();
}

async function downloadPlanningImage({
  entries,
  days,
  layout,
  range,
  locale,
  title,
  startHour = 8,
}: {
  entries: PlanningImageEntry[];
  days: Date[];
  layout: PlanningImageLayout;
  range: ImageRange;
  locale: string;
  title: string;
  startHour?: number;
}) {
  const dateLocale = locale === "fr" ? fr : enUS;
  const rangeEnd = addDays(startOfDay(range.end), 1);
  const usableEntries = entries.filter((entry) => {
    const { start, end } = entryInterval(entry);
    return start < rangeEnd && end > startOfDay(range.start);
  });

  let minHour = Math.max(0, Math.min(23, startHour));
  let maxHour = 22;
  for (const entry of usableEntries) {
    const { start, end } = entryInterval(entry);
    if (format(start, "yyyy-MM-dd") !== format(end, "yyyy-MM-dd")) {
      minHour = 0;
      maxHour = 24;
    } else {
      minHour = Math.min(minHour, start.getHours());
      maxHour = Math.max(maxHour, end.getHours() + (end.getMinutes() > 0 ? 1 : 0));
    }
  }
  maxHour = Math.min(24, Math.max(minHour + 1, maxHour));

  const columnWidth =
    layout.kind === "locationColumns" ? LOCATION_COLUMN_WIDTH : DAY_COLUMN_WIDTH;
  const columnCount =
    layout.kind === "locationColumns" ? Math.max(1, layout.locations.length) : 1;
  const dayWidth = TIME_GUTTER + columnCount * columnWidth;
  const headerRowsHeight =
    DAY_HEADER_HEIGHT + (layout.kind === "locationColumns" ? LOCATION_HEADER_HEIGHT : 0);
  const timelineHeight = (maxHour - minHour) * 60 * PX_PER_MINUTE;
  const width = PAGE_PADDING * 2 + days.length * dayWidth;
  const height = PAGE_PADDING * 2 + HEADER_HEIGHT + headerRowsHeight + timelineHeight;
  const scale = Math.min(2, MAX_CANVAS_EDGE / width, MAX_CANVAS_EDGE / height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available");
  }
  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.textBaseline = "top";
  context.fillStyle = "#1c1917";
  context.font = "600 22px system-ui, sans-serif";
  context.fillText(title, PAGE_PADDING, PAGE_PADDING);
  context.fillStyle = "#78716c";
  context.font = "13px system-ui, sans-serif";
  context.fillText(
    `${format(range.start, "d MMM yyyy", { locale: dateLocale })} – ${format(range.end, "d MMM yyyy", { locale: dateLocale })}`,
    PAGE_PADDING,
    PAGE_PADDING + 32,
  );

  const gridTop = PAGE_PADDING + HEADER_HEIGHT;
  const timelineTop = gridTop + headerRowsHeight;

  const drawColumnGrid = (columnX: number) => {
    context.fillStyle = "#fafaf9";
    context.fillRect(columnX, timelineTop, columnWidth - 1, timelineHeight);
    for (let hour = minHour; hour <= maxHour; hour += 1) {
      const y = timelineTop + (hour - minHour) * 60 * PX_PER_MINUTE;
      context.strokeStyle = "#e7e5e4";
      context.beginPath();
      context.moveTo(columnX, y + 0.5);
      context.lineTo(columnX + columnWidth - 1, y + 0.5);
      context.stroke();
    }
  };

  function blockGeometry(segment: DaySegment) {
    const top = timelineTop + Math.max(0, segment.startMinute - minHour * 60) * PX_PER_MINUTE;
    const height = Math.max(
      MIN_BLOCK_HEIGHT,
      Math.min(
        timelineHeight - (top - timelineTop),
        (segment.endMinute - segment.startMinute) * PX_PER_MINUTE,
      ),
    );
    return { top, height };
  }

  days.forEach((day, dayIndex) => {
    const dayX = PAGE_PADDING + dayIndex * dayWidth;
    context.fillStyle = "#292524";
    context.fillRect(dayX, gridTop, dayWidth - 8, DAY_HEADER_HEIGHT);
    context.fillStyle = "#ffffff";
    context.font = "600 13px system-ui, sans-serif";
    context.fillText(
      format(day, "EEEE d MMM", { locale: dateLocale }),
      dayX + 10,
      gridTop + 9,
    );

    if (layout.kind === "locationColumns") {
      layout.locations.forEach((location, locationIndex) => {
        const columnX = dayX + TIME_GUTTER + locationIndex * columnWidth;
        context.fillStyle = "#f5f5f4";
        context.fillRect(
          columnX,
          gridTop + DAY_HEADER_HEIGHT,
          columnWidth - 1,
          LOCATION_HEADER_HEIGHT,
        );
        context.fillStyle = "#57534e";
        context.font = "600 11px system-ui, sans-serif";
        const locationLabel = wrapText(context, location.name, columnWidth - 12, 1)[0] ?? "";
        context.fillText(locationLabel, columnX + 6, gridTop + DAY_HEADER_HEIGHT + 7);
        drawColumnGrid(columnX);

        const segments = daySegments(
          usableEntries.filter((entry) => entry.locationKey === location.id),
          day,
        );
        for (const segment of segments) {
          const { top, height: blockHeight } = blockGeometry(segment);
          const laneWidth = (columnWidth - 7) / segment.lanes;
          drawEventBlock(context, {
            x: columnX + 3 + segment.lane * laneWidth,
            y: top + 2,
            width: laneWidth - 2,
            height: blockHeight - 4,
            colorKey: segment.entry.colorKey,
            lines: [
              {
                text: segment.entry.label,
                font: "600 11px system-ui, sans-serif",
                maxLines: blockHeight >= 58 ? 2 : 1,
              },
              {
                text: `${formatTime(segment.start)}–${formatTime(segment.end)}`,
                font: "10px system-ui, sans-serif",
                maxLines: 1,
              },
            ],
          });
        }
      });
    } else {
      const columnX = dayX + TIME_GUTTER;
      drawColumnGrid(columnX);

      for (const segment of daySegments(usableEntries, day)) {
        const { top, height: blockHeight } = blockGeometry(segment);
        const laneWidth = (columnWidth - 7) / segment.lanes;
        drawEventBlock(context, {
          x: columnX + 3 + segment.lane * laneWidth,
          y: top + 2,
          width: laneWidth - 2,
          height: blockHeight - 4,
          colorKey: segment.entry.colorKey,
          lines: [
            {
              text: segment.entry.label,
              font: "600 11px system-ui, sans-serif",
              maxLines: blockHeight >= 58 ? 2 : 1,
            },
            {
              text: `${formatTime(segment.start)}–${formatTime(segment.end)}`,
              font: "10px system-ui, sans-serif",
              maxLines: 1,
            },
            ...(segment.entry.locationName
              ? [
                  {
                    text: segment.entry.locationName,
                    font: "10px system-ui, sans-serif",
                    maxLines: 1,
                  },
                ]
              : []),
          ],
        });
      }
    }

    context.fillStyle = "#78716c";
    context.font = "10px system-ui, sans-serif";
    for (let hour = minHour; hour <= maxHour; hour += 1) {
      const y = timelineTop + (hour - minHour) * 60 * PX_PER_MINUTE;
      context.fillText(`${String(hour).padStart(2, "0")}:00`, dayX + 4, y + 3);
    }
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("Could not create image");
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = planningFileName(range);
  link.click();
  URL.revokeObjectURL(url);
}

function schedulingEntries(placements: SchedulePlacement[]): PlanningImageEntry[] {
  return placements.map((placement) => ({
    id: placement.itemId,
    label: placement.groupName
      ? `${placement.choreographyTitle} · ${placement.groupName}`
      : placement.choreographyTitle,
    startsAt: placement.startsAt,
    endsAt: placement.endsAt,
    locationKey: placement.locationId,
    locationName: placement.locationName,
    colorKey: `${placement.choreographyId}:${placement.groupId ?? ""}`,
  }));
}

export function SchedulingImageExportButton({
  placements,
  days,
  locations,
}: {
  placements: SchedulePlacement[];
  days?: string[];
  locations?: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations("Components");
  const locale = useLocale();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entries = useMemo(() => schedulingEntries(placements), [placements]);

  async function exportImage() {
    if (entries.length === 0) {
      return;
    }
    setError(null);
    setExporting(true);
    try {
      const exportDays = days?.map(parseDayKey) ?? [
        ...new Map(
          entries.map((entry) => {
            const date = startOfDay(new Date(entry.startsAt));
            return [format(date, "yyyy-MM-dd"), date] as const;
          }),
        ).values(),
      ].sort((a, b) => a.getTime() - b.getTime());
      const exportLocations = locations ?? [
        ...new Map(entries.map((entry) => [entry.locationKey, entry.locationName] as const)).entries(),
      ].map(([id, name]) => ({ id, name }));
      await downloadPlanningImage({
        entries,
        days: exportDays,
        layout: { kind: "locationColumns", locations: exportLocations },
        range: {
          start: exportDays[0],
          end: exportDays[exportDays.length - 1],
        },
        locale,
        title: t("planningImageTitle"),
      });
    } catch {
      setError(t("exportImageError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={exportImage}
        disabled={exporting || entries.length === 0}
      >
        {exporting ? t("exportingImage") : t("exportPlanningImage")}
      </Button>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function PlanningImageExportButton({
  events,
  startOfDayHour,
}: {
  events: SerializedScheduleEvent[];
  startOfDayHour: number;
}) {
  const t = useTranslations("Components");
  const locale = useLocale();
  const currentWeek = useMemo(() => {
    const now = new Date();
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }, []);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(currentWeek.start, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(currentWeek.end, "yyyy-MM-dd"));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function exportImage() {
    const start = parseDayKey(startDate);
    const end = parseDayKey(endDate);
    if (end < start) {
      setError(t("exportDateRangeInvalid"));
      return;
    }
    const range = { start, end };
    const entries: PlanningImageEntry[] = events.map((event) => ({
      id: event.id,
      label:
        event.typeKind === "REHEARSAL" && event.choreographyTitle
          ? event.choreographyTitle
          : scheduleEventLabel(event),
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      locationKey: event.location ?? "__none__",
      locationName: event.location ?? "",
      colorKey: event.choreographyId ?? event.typeId,
    }));
    const rangeEntries = entries.filter((entry) => {
      const eventStart = new Date(entry.startsAt);
      const eventEnd = entry.endsAt
        ? new Date(entry.endsAt)
        : new Date(eventStart.getTime() + 60 * 60_000);
      return eventStart < addDays(startOfDay(end), 1) && eventEnd > startOfDay(start);
    });

    setError(null);
    setExporting(true);
    try {
      await downloadPlanningImage({
        entries: rangeEntries,
        days: eachDayOfInterval(range),
        layout: { kind: "overlapLanes" },
        range,
        locale,
        title: t("planningImageTitle"),
        startHour: startOfDayHour,
      });
      setOpen(false);
    } catch {
      setError(t("exportImageError"));
    } finally {
      setExporting(false);
    }
  }

  const exportLabel = t("exportPlanningImage");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 disabled:opacity-50"
        aria-label={exportLabel}
        title={exportLabel}
      >
        <ExportImageIcon />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planning-export-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 id="planning-export-title" className="text-lg font-semibold">
              {t("exportPlanningImage")}
            </h2>
            <p className="mt-1 text-sm text-stone-600">{t("exportPlanningImageHelp")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="planning-export-start">{t("exportStartDate")}</Label>
                <Input
                  id="planning-export-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="planning-export-end">{t("exportEndDate")}</Label>
                <Input
                  id="planning-export-end"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                onClick={exportImage}
                disabled={exporting || !startDate || !endDate}
              >
                {exporting ? t("exportingImage") : t("downloadImage")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
