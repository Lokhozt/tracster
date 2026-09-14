import type { EventKind } from "@/lib/event-type-helpers";

export const EVENT_TYPE_FILTER_COOKIE = "tracster_hidden_event_types";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseHiddenEventTypeIds(value?: string): string[] {
  if (!value) {
    return [];
  }

  try {
    return decodeURIComponent(value)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function persistHiddenEventTypeIds(ids: string[]) {
  document.cookie = `${EVENT_TYPE_FILTER_COOKIE}=${encodeURIComponent(ids.join(","))}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** Light tint for event cards, matching the category chip colors at a readable contrast. */
export function eventCardClassName(kind: EventKind | null): string {
  if (kind === "REHEARSAL") {
    return "border-stone-200 bg-stone-50 hover:border-stone-400";
  }
  if (kind === "REPRESENTATION") {
    return "border-amber-200 bg-amber-50 hover:border-amber-400";
  }
  if (kind === "COMPETITION") {
    return "border-violet-200 bg-violet-50 hover:border-violet-400";
  }
  if (kind === "DEMONSTRATION") {
    return "border-teal-200 bg-teal-50 hover:border-teal-400";
  }
  if (kind === "FESTIVAL") {
    return "border-rose-200 bg-rose-50 hover:border-rose-400";
  }
  return "border-sky-200 bg-sky-50 hover:border-sky-400";
}

export function eventCategoryClassName(kind: EventKind | null): string {
  if (kind === "REHEARSAL") {
    return "border-stone-300 bg-stone-100 text-stone-800";
  }
  if (kind === "REPRESENTATION") {
    return "border-amber-300 bg-amber-100 text-amber-900";
  }
  if (kind === "COMPETITION") {
    return "border-violet-300 bg-violet-100 text-violet-900";
  }
  if (kind === "DEMONSTRATION") {
    return "border-teal-300 bg-teal-100 text-teal-900";
  }
  if (kind === "FESTIVAL") {
    return "border-rose-300 bg-rose-100 text-rose-900";
  }
  return "border-sky-300 bg-sky-100 text-sky-900";
}
