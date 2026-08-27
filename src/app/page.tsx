import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RepetitionCalendar } from "@/components/RepetitionCalendar";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { getCurrentUser } from "@/lib/auth";
import { getUpcomingScheduleEvents, getUserScheduleEvents } from "@/lib/schedule";
import { formatBirthdayGreeting, getUsersWithBirthdayToday } from "@/lib/users";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    const [events, birthdayUsers] = await Promise.all([
      getUserScheduleEvents(user.id),
      getUsersWithBirthdayToday(),
    ]);
    const upcoming = getUpcomingScheduleEvents(events);
    const birthdayGreeting = formatBirthdayGreeting(birthdayUsers);

    return (
      <AppShell title="Schedule">
        {birthdayGreeting && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            {birthdayGreeting}
          </p>
        )}
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
        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Plan choreographies and track availability
        </h1>
        <p className="mb-8 text-base text-stone-600 sm:text-lg">
          Tracster helps associations organize rehearsals, assign participants, and
          collect availability for each repetition.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-5 py-3 text-sm font-medium hover:bg-stone-100"
          >
            Sign in
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
