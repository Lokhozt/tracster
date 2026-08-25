import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RepetitionCalendar } from "@/components/RepetitionCalendar";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { getCurrentUser } from "@/lib/auth";
import { getUpcomingScheduleEvents, getUserScheduleEvents } from "@/lib/schedule";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    const events = await getUserScheduleEvents(user.id);
    const upcoming = getUpcomingScheduleEvents(events);

    return (
      <AppShell title="Schedule">
        <RepetitionCalendar events={events} />
        <UpcomingEventsList events={upcoming} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl py-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-500">
          Rehearsal planning
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight">
          Plan choreographies and track availability
        </h1>
        <p className="mb-8 text-lg text-stone-600">
          Tracster helps associations organize rehearsals, assign participants, and
          collect availability for each repetition.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-stone-300 px-5 py-3 text-sm font-medium hover:bg-stone-100"
          >
            Sign in
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
