import type { EventKind } from "@/lib/event-type-helpers";

export const EVENT_TYPE_FILTER_COOKIE = "tracster_hidden_event_types";
export const HIDE_NON_PARTICIPATING_COOKIE = "tracster_hide_non_participating";
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

export function parseHideNonParticipating(value?: string): boolean {
  return value === "1";
}

export function persistHideNonParticipating(value: boolean) {
  document.cookie = `${HIDE_NON_PARTICIPATING_COOKIE}=${value ? "1" : "0"}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** Light tint for event cards, matching the category chip colors at a readable contrast. */
/** Left edge colour of an event row, by type (the rest of the row stays neutral). */
const EVENT_EDGE: Record<string, string> = {
  REHEARSAL: "border-l-stone-900",
  REPRESENTATION: "border-l-amber-400",
  COMPETITION: "border-l-violet-500",
  DEMONSTRATION: "border-l-teal-500",
  FESTIVAL: "border-l-rose-500",
  TRAINING: "border-l-orange-500",
  PARTY: "border-l-fuchsia-500",
};

/**
 * Event row surface ("call sheet" rows): neutral, with the type as a coloured left edge.
 * Hover lifts the row with a shadow (a border colour would hide the type edge).
 */
export function eventCardClassName(kind: EventKind | null): string {
  const edge = (kind && EVENT_EDGE[kind]) ?? "border-l-sky-500";
  return `border-stone-200 border-l-4 bg-white hover:shadow-md ${edge}`;
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
  if (kind === "TRAINING") {
    return "border-orange-300 bg-orange-100 text-orange-900";
  }
  if (kind === "PARTY") {
    return "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-900";
  }
  return "border-sky-300 bg-sky-100 text-sky-900";
}

/** Schedule cells and badges: same hues as `eventCategoryClassName`, without borders. */
export function eventScheduleKindClassName(
  kind: EventKind | null,
  options?: { hover?: boolean },
): string {
  const hover = options?.hover ?? false;
  if (kind === "REHEARSAL") {
    return cnSchedule("bg-stone-100 text-stone-800", hover, "hover:bg-stone-200");
  }
  if (kind === "REPRESENTATION") {
    return cnSchedule("bg-amber-100 text-amber-900", hover, "hover:bg-amber-200");
  }
  if (kind === "COMPETITION") {
    return cnSchedule("bg-violet-100 text-violet-900", hover, "hover:bg-violet-200");
  }
  if (kind === "DEMONSTRATION") {
    return cnSchedule("bg-teal-100 text-teal-900", hover, "hover:bg-teal-200");
  }
  if (kind === "FESTIVAL") {
    return cnSchedule("bg-rose-100 text-rose-900", hover, "hover:bg-rose-200");
  }
  if (kind === "TRAINING") {
    return cnSchedule("bg-orange-100 text-orange-900", hover, "hover:bg-orange-200");
  }
  if (kind === "PARTY") {
    return cnSchedule("bg-fuchsia-100 text-fuchsia-900", hover, "hover:bg-fuchsia-200");
  }
  return cnSchedule("bg-sky-100 text-sky-900", hover, "hover:bg-sky-200");
}

function cnSchedule(base: string, hover: boolean, hoverClass: string) {
  return hover ? `${base} ${hoverClass}` : base;
}
