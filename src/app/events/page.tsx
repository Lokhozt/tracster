import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { EventsList } from "@/components/EventsList";
import { getCurrentUser } from "@/lib/auth";
import { canEditEvent, getUserEvents, serializeEvent } from "@/lib/events";
import { hasGlobalAccess } from "@/lib/roles";
import { canCreateEvent } from "@/lib/site-settings";

export default async function EventsPage() {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.Events"),
  ]);
  if (!user) {
    redirect("/login");
  }

  const events = await getUserEvents(user.id);
  const globalAccess = await hasGlobalAccess(user.id);
  const canCreate = await canCreateEvent(user.id);

  const eventItems = await Promise.all(
    events.map(async (entry) => ({
      event: serializeEvent(entry),
      canEdit: await canEditEvent(entry.id, user.id),
      isParticipating:
        entry.participants.some((participant) => participant.userId === user.id) ||
        entry.createdById === user.id,
      isEventParticipant: entry.participants.some((participant) => participant.userId === user.id),
      hasPendingJoinRequest: entry.joinRequests.some((request) => request.userId === user.id),
    })),
  );

  return (
    <AppShell title={t("title")}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-stone-600">
          {globalAccess
            ? t("introAll")
            : t("introRelevant")}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          {globalAccess && (
            <Link
              href="/scheduling"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
            >
              {t("scheduleRehearsals")}
            </Link>
          )}
          {canCreate && (
            <Link
              href="/events/new"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              {t("newEvent")}
            </Link>
          )}
        </div>
      </div>

      {eventItems.length === 0 ? (
        <p className="text-stone-600">
          {canCreate ? t("emptyCreate") : t("empty")}
        </p>
      ) : (
        <EventsList events={eventItems} />
      )}
    </AppShell>
  );
}
