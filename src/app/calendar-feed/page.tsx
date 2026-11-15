import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { CalendarFeedSettings } from "@/components/CalendarFeedSettings";
import { getAppName } from "@/lib/app-name";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { filterEventTypesForViewer } from "@/lib/event-type-helpers";
import { getEventTypes } from "@/lib/event-types";
import { canManageAllEvents } from "@/lib/roles";

/** Calendar subscription link (ICS) for Google, Outlook, Apple Calendar… with per-type choices. */
export default async function CalendarFeedPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [t, feed, eventTypes, seesAllEvents] = await Promise.all([
    getTranslations("Pages.CalendarFeed"),
    prisma.user.findUnique({ where: { id: user.id }, select: { calendarFeedToken: true } }),
    getEventTypes(),
    canManageAllEvents(user.id),
  ]);
  const visibleTypes = filterEventTypesForViewer(eventTypes, {
    isCompetitor: user.isCompetitor,
    seesAllEvents,
  });

  return (
    <AppShell title={t("title")}>
      <CalendarFeedSettings
        initialToken={feed?.calendarFeedToken ?? null}
        appUrl={process.env.NEXT_PUBLIC_APP_URL || null}
        email={user.email}
        calendarName={getAppName()}
        eventTypes={visibleTypes.map((type) => ({ id: type.id, name: type.name, kind: type.kind }))}
      />
    </AppShell>
  );
}
