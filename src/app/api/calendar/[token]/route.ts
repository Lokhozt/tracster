import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppName } from "@/lib/app-name";
import { buildIcsCalendar, parseFeedSelection, selectFeedEvents, toIcsEvent } from "@/lib/calendar-feed";
import { getUserScheduleEvents } from "@/lib/schedule";
import { getServerTranslator } from "@/i18n/server";

/**
 * Personal calendar subscription (ICS) for Google, Outlook, Apple Calendar…: no session, the
 * secret in the path identifies the member. Read-only; the query picks the event types.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/calendar/[token]">) {
  const { token: segment } = await context.params;
  const token = segment.replace(/\.ics$/i, "");
  if (!token) {
    return new Response("Not found", { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { calendarFeedToken: token },
    select: { id: true, displayLanguage: true },
  });
  if (!user) {
    return new Response("Not found", { status: 404 });
  }

  const [translator, eventTypes] = await Promise.all([
    getServerTranslator(user.displayLanguage),
    prisma.eventType.findMany({ select: { id: true } }),
  ]);
  const events = await getUserScheduleEvents(user.id, translator);
  const now = new Date();
  const selection = parseFeedSelection(
    request.nextUrl.searchParams,
    eventTypes.map((type) => type.id),
  );

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  const host = new URL(appUrl).host;
  const body = buildIcsCalendar({
    name: getAppName(),
    now,
    events: selectFeedEvents(events, selection, now).map((event) => toIcsEvent(event, appUrl, host)),
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="calendar.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
