import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EventsList } from "@/components/EventsList";
import { getCurrentUser } from "@/lib/auth";
import { canEditEvent, getUserEvents, serializeEvent } from "@/lib/events";
import { hasGlobalAccess } from "@/lib/roles";

export default async function EventsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const events = await getUserEvents(user.id);
  const globalAccess = await hasGlobalAccess(user.id);

  const eventItems = await Promise.all(
    events.map(async (entry) => ({
      event: serializeEvent(entry),
      canEdit: await canEditEvent(entry.id, user.id),
      isParticipating:
        entry.participants.some((participant) => participant.userId === user.id) ||
        entry.createdById === user.id,
    })),
  );

  return (
    <AppShell title="Events">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-stone-600">
          {globalAccess
            ? "All association events."
            : "Events you created or participate in."}
        </p>
        <Link
          href="/events/new"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          New event
        </Link>
      </div>

      {eventItems.length === 0 ? (
        <p className="text-stone-600">No events yet. Create your first one.</p>
      ) : (
        <EventsList events={eventItems} />
      )}
    </AppShell>
  );
}
