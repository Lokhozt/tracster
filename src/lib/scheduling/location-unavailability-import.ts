import { addDays } from "date-fns";
import { z } from "zod";
import { localDayKey, parseDayKey, startOfLocalDay } from "@/lib/scheduling/intervals";
import type { LocationUnavailability } from "@/lib/scheduling/types";

export const IGNORE_IMPORTED_ROOM = "__ignore__";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const locationUnavailabilityImportSchema = z.object({
  format_version: z.string().optional(),
  weekend: z
    .object({
      start: dateKeySchema,
      end: dateKeySchema,
    })
    .optional(),
  locations: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1),
        unavailabilities: z
          .array(
            z.object({
              start: z.string().min(1),
              end: z.string().min(1),
            }),
          )
          .default([]),
      }),
    )
    .min(1),
});

export type ImportedRoom = {
  id: string;
  name: string;
  intervals: Array<{ start: Date; end: Date }>;
};

export type ParsedLocationUnavailabilityImport = {
  weekendDays: string[];
  rooms: ImportedRoom[];
};

export type LocationOption = {
  id: string;
  name: string;
};

export type ApplyLocationUnavailabilityImportResult =
  | {
      ok: true;
      days: string[];
      locationIds: string[];
      unavailabilities: LocationUnavailability[];
    }
  | { ok: false; reason: "unmapped_room" | "invalid_interval" };

const localDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

export function parseLocalDateTime(value: string): Date | null {
  const trimmed = value.trim();
  const naive = trimmed.match(localDateTimePattern);
  if (naive) {
    const date = new Date(
      Number(naive[1]),
      Number(naive[2]) - 1,
      Number(naive[3]),
      Number(naive[4]),
      Number(naive[5]),
      Number(naive[6] ?? 0),
      0,
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function eachDayKey(start: string, end: string): string[] {
  const days: string[] = [];
  let current = parseDayKey(start);
  const last = parseDayKey(end);
  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime()) || current > last) {
    return [];
  }

  while (current <= last) {
    days.push(localDayKey(current));
    current = addDays(current, 1);
  }
  return days;
}

export function splitIntervalByDay(
  locationId: string,
  start: Date,
  end: Date,
): LocationUnavailability[] {
  const entries: LocationUnavailability[] = [];
  let cursor = start.getTime();
  const endMs = end.getTime();

  while (cursor < endMs) {
    const cursorDate = new Date(cursor);
    const day = localDayKey(cursorDate);
    const nextDay = addDays(startOfLocalDay(cursorDate), 1).getTime();
    const sliceEnd = Math.min(endMs, nextDay);
    if (sliceEnd > cursor) {
      entries.push({
        locationId,
        day,
        startsAt: new Date(cursor).toISOString(),
        endsAt: new Date(sliceEnd).toISOString(),
      });
    }
    cursor = nextDay;
  }

  return entries;
}

export function parseLocationUnavailabilityImport(
  input: string,
): { ok: true; data: ParsedLocationUnavailabilityImport } | { ok: false; reason: "invalid_json" | "invalid_format" } {
  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  const parsed = locationUnavailabilityImportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_format" };
  }

  const weekendDays = parsed.data.weekend
    ? eachDayKey(parsed.data.weekend.start, parsed.data.weekend.end)
    : [];
  if (parsed.data.weekend && weekendDays.length === 0) {
    return { ok: false, reason: "invalid_format" };
  }

  const rooms: ImportedRoom[] = [];
  for (const location of parsed.data.locations) {
    const intervals: ImportedRoom["intervals"] = [];
    for (const entry of location.unavailabilities) {
      const start = parseLocalDateTime(entry.start);
      const end = parseLocalDateTime(entry.end);
      if (!start || !end || end <= start) {
        return { ok: false, reason: "invalid_format" };
      }
      intervals.push({ start, end });
    }
    rooms.push({
      id: location.id,
      name: location.name,
      intervals,
    });
  }

  return { ok: true, data: { weekendDays, rooms } };
}

export function suggestedLocationId(
  room: Pick<ImportedRoom, "id" | "name">,
  locations: LocationOption[],
): string {
  const name = room.name.trim().toLowerCase();
  const slug = room.id.trim().toLowerCase();
  const byName = locations.find((location) => location.name.trim().toLowerCase() === name);
  if (byName) {
    return byName.id;
  }
  const bySlugName = locations.find(
    (location) => location.name.trim().toLowerCase().replace(/\s+/g, "-") === slug,
  );
  return bySlugName?.id ?? IGNORE_IMPORTED_ROOM;
}

export function defaultRoomMappings(
  rooms: ImportedRoom[],
  locations: LocationOption[],
): Record<string, string> {
  return Object.fromEntries(rooms.map((room) => [room.id, suggestedLocationId(room, locations)]));
}

export function applyRoomMappings(
  data: ParsedLocationUnavailabilityImport,
  mapping: Record<string, string>,
): ApplyLocationUnavailabilityImportResult {
  const days = new Set(data.weekendDays);
  const locationIds = new Set<string>();
  const unavailabilities: LocationUnavailability[] = [];

  for (const room of data.rooms) {
    const mapped = mapping[room.id];
    if (!mapped) {
      return { ok: false, reason: "unmapped_room" };
    }
    if (mapped === IGNORE_IMPORTED_ROOM) {
      continue;
    }

    locationIds.add(mapped);
    for (const interval of room.intervals) {
      const pieces = splitIntervalByDay(mapped, interval.start, interval.end);
      if (pieces.length === 0) {
        return { ok: false, reason: "invalid_interval" };
      }
      for (const piece of pieces) {
        days.add(piece.day);
        unavailabilities.push(piece);
      }
    }
  }

  return {
    ok: true,
    days: [...days].sort(),
    locationIds: [...locationIds],
    unavailabilities,
  };
}
