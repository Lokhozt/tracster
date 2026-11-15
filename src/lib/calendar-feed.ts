import { isOnUsersAgenda } from "@/lib/agenda-rules";
import { scheduleEventEnd, scheduleEventLabel, type SerializedScheduleEvent } from "@/lib/schedule-filters";

/** Per event type: left out, only the user's own events, or every event they can see. */
export type FeedTypeChoice = "off" | "mine" | "all";

/** Event type id → choice. Types missing from the map are left out. */
export type FeedSelection = Record<string, FeedTypeChoice>;

/** Past events kept in the feed, so a calendar does not drop last week's rehearsal at once. */
const PAST_DAYS_KEPT = 60;

/**
 * The selection travels in the link (`?mine=<typeIds>&all=<typeIds>`), so one person can
 * subscribe several calendars to different selections. No parameter: every type, "mine".
 */
export function parseFeedSelection(
  params: URLSearchParams,
  typeIds: readonly string[],
): FeedSelection {
  const listed = (name: string) =>
    new Set((params.get(name) ?? "").split(",").map((id) => id.trim()).filter(Boolean));
  const mine = listed("mine");
  const all = listed("all");
  const selection: FeedSelection = {};
  for (const typeId of typeIds) {
    if (mine.size === 0 && all.size === 0) {
      selection[typeId] = "mine";
    } else {
      selection[typeId] = all.has(typeId) ? "all" : mine.has(typeId) ? "mine" : "off";
    }
  }
  return selection;
}

export function feedSelectionQuery(selection: FeedSelection): string {
  const idsWith = (choice: FeedTypeChoice) =>
    Object.entries(selection)
      .filter(([, value]) => value === choice)
      .map(([typeId]) => typeId);
  const params = new URLSearchParams();
  const mine = idsWith("mine");
  const all = idsWith("all");
  if (mine.length) params.set("mine", mine.join(","));
  if (all.length) params.set("all", all.join(","));
  // Nothing chosen: an explicit empty selection, not the "everything mine" default.
  if (!mine.length && !all.length) params.set("mine", "none");
  return params.toString().replaceAll("%2C", ",");
}

export function selectFeedEvents(
  events: readonly SerializedScheduleEvent[],
  selection: FeedSelection,
  now: Date,
): SerializedScheduleEvent[] {
  const keptFrom = new Date(now.getTime() - PAST_DAYS_KEPT * 24 * 60 * 60 * 1000);
  return events.filter((event) => {
    const choice = selection[event.typeId] ?? "off";
    if (choice === "off" || scheduleEventEnd(event) < keptFrom) {
      return false;
    }
    return choice === "all" || isOnUsersAgenda(event);
  });
}

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
};

/** "Répétition · Jazz Funk Showcase", "Soirée de fin d'année". */
export function feedEventSummary(event: SerializedScheduleEvent): string {
  const label = scheduleEventLabel(event);
  if (event.typeKind === "REHEARSAL" && event.choreographyTitle && event.choreographyTitle !== label) {
    return `${label} · ${event.choreographyTitle}`;
  }
  return label;
}

export function toIcsEvent(event: SerializedScheduleEvent, appUrl: string, host: string): IcsEvent {
  const details = [event.typeName, event.groupName].filter(Boolean).join(" · ");
  const url = `${appUrl}${event.href}`;
  return {
    uid: `${event.id}@${host}`,
    start: new Date(event.startsAt),
    end: scheduleEventEnd(event),
    summary: feedEventSummary(event),
    location: event.location,
    description: [details, url].filter(Boolean).join("\n"),
    url,
  };
}

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 TEXT: backslash, semicolon, comma and newlines are escaped. */
function icsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545 §3.1). */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) {
    return line;
  }
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += character;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcsCalendar({
  name,
  events,
  now,
}: {
  name: string;
  events: readonly IcsEvent[];
  now: Date;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tracster//calendar feed//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(name)}`,
    // Hints for apps that honour them (Apple, Outlook): check again every hour.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(event.start)}`,
      `DTEND:${icsDate(event.end)}`,
      `SUMMARY:${icsText(event.summary)}`,
    );
    if (event.location) lines.push(`LOCATION:${icsText(event.location)}`);
    if (event.description) lines.push(`DESCRIPTION:${icsText(event.description)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export type CalendarProvider = "google" | "outlook" | "apple";

const PROVIDER_EMAIL_DOMAINS: Record<CalendarProvider, RegExp> = {
  google: /^(gmail|googlemail)\.com$/,
  outlook: /^(outlook|hotmail|live|msn|windowslive)\.[a-z.]+$/,
  apple: /^(icloud|me|mac)\.com$/,
};

/**
 * Best guess of the member's calendar, to suggest one button first: the email domain, then the
 * device (Apple devices have Apple Calendar). Browsers cannot see which calendar apps exist,
 * so this is only a guess and the other buttons stay available.
 */
export function guessCalendarProvider(email: string, userAgent: string): CalendarProvider | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const isAndroid = /android/i.test(userAgent);
  for (const provider of ["google", "outlook", "apple"] as const) {
    if (PROVIDER_EMAIL_DOMAINS[provider].test(domain)) {
      // Apple Calendar is not on Android: no useful suggestion there.
      return provider === "apple" && isAndroid ? null : provider;
    }
  }
  if (!isAndroid && /iphone|ipad|macintosh/i.test(userAgent)) {
    return "apple";
  }
  return null;
}

/** One-tap "add by link" pages (each asks to confirm in the calendar's own site). */
export function calendarProviderAddUrl(provider: CalendarProvider, feedUrl: string, name: string): string {
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
  if (provider === "google") {
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
  }
  if (provider === "outlook") {
    const params = new URLSearchParams({ url: feedUrl, name });
    return `https://outlook.live.com/calendar/0/addfromweb?${params}`;
  }
  return webcalUrl;
}
