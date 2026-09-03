import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { RehearsalCalendar } from "@/components/RehearsalCalendar";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FollowAssociationCalendarLink } from "@/components/FollowAssociationCalendarLink";
import { associationCalendarFollowUrl } from "@/lib/google-calendar";
import { getUpcomingScheduleEvents, getUserScheduleEvents } from "@/lib/schedule";
import { APP_LOGO_SRC, isS3Configured } from "@/lib/s3";
import { formatBirthdayGreeting, isBirthdayOnDate } from "@/lib/users";

async function getUsersWithBirthdayToday(now = new Date()) {
  const users = await prisma.user.findMany({
    where: { dateOfBirth: { not: null } },
    select: { firstName: true, lastName: true, dateOfBirth: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return users.filter(
    (user): user is typeof user & { dateOfBirth: Date } =>
      user.dateOfBirth !== null && isBirthdayOnDate(user.dateOfBirth, now),
  );
}

export default async function HomePage() {
  const [user, t, tCommon] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.Home"),
    getTranslations("Common"),
  ]);
  const logoSrc = isS3Configured() ? APP_LOGO_SRC : null;
  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M9.8 4.4 11 2l1.2 2.4a4 4 0 0 0 1.8 1.8L16.5 7 14 8.2a4 4 0 0 0-1.8 1.8L11 12.5 9.8 10A4 4 0 0 0 8 8.2L5.5 7 8 6.2a4 4 0 0 0 1.8-1.8ZM17.3 14.1l.7-1.6.7 1.6a3 3 0 0 0 1.2 1.2l1.6.7-1.6.7a3 3 0 0 0-1.2 1.2l-.7 1.6-.7-1.6a3 3 0 0 0-1.2-1.2l-1.6-.7 1.6-.7a3 3 0 0 0 1.2-1.2ZM5.3 15.1l.7-1.6.7 1.6a3 3 0 0 0 1.2 1.2l1.6.7-1.6.7a3 3 0 0 0-1.2 1.2L6 20.5l-.7-1.6a3 3 0 0 0-1.2-1.2L2.5 17l1.6-.7a3 3 0 0 0 1.2-1.2Z"
          />
        </svg>
      ),
      iconClassName: "bg-violet-100 text-violet-700",
      title: t("features.choreographies.title"),
      description: t("features.choreographies.description"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M3.5 7.5h6l2-2h9v13h-17v-11Z"
          />
          <path
            fill="currentColor"
            stroke="none"
            d="m10 10 5 3-5 3v-6Z"
          />
        </svg>
      ),
      iconClassName: "bg-rose-100 text-rose-700",
      title: t("features.resources.title"),
      description: t("features.resources.description"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m8 14 2.5 2.5L16 11"
          />
        </svg>
      ),
      iconClassName: "bg-amber-100 text-amber-700",
      title: t("features.planning.title"),
      description: t("features.planning.description"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M8 14a4 4 0 0 1 6.8-1.9M16 11v2.5h-2.5M16 16a4 4 0 0 1-6.8 1.9M8 19v-2.5h2.5"
          />
        </svg>
      ),
      iconClassName: "bg-sky-100 text-sky-700",
      title: t("features.calendar.title"),
      description: t("features.calendar.description"),
    },
  ];

  if (user) {
    const [events, birthdayUsers] = await Promise.all([
      getUserScheduleEvents(user.id),
      getUsersWithBirthdayToday(),
    ]);
    const upcoming = getUpcomingScheduleEvents(events);
    const birthdayGreeting = formatBirthdayGreeting(birthdayUsers);
    const associationCalendarUrl = associationCalendarFollowUrl();

    return (
      <AppShell title={t("title")}>
        {birthdayGreeting && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            {birthdayGreeting}
          </p>
        )}
        {associationCalendarUrl && (
          <p className="mb-4">
            <FollowAssociationCalendarLink href={associationCalendarUrl} />
          </p>
        )}
        <RehearsalCalendar events={events} />
        <UpcomingEventsList events={upcoming} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl py-10 text-center sm:py-16">
        <h1 className="mb-4 flex items-center justify-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="h-12 w-auto object-contain sm:h-14"
            />
          ) : null}
          {tCommon("appName")}
        </h1>
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-500">
          {t("eyebrow")}
        </p>
        <p className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("heading")}
        </p>
        <p className="mx-auto mb-8 max-w-2xl text-base text-stone-600 sm:text-lg">
          {t("intro")}
        </p>
        <ul className="mb-10 grid gap-4 text-left sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <span
                aria-hidden="true"
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl p-2 ${feature.iconClassName} [&>svg]:size-full`}
              >
                {feature.icon}
              </span>
              <div>
                <h2 className="mb-1 font-semibold text-stone-900">
                  {feature.title}
                </h2>
                <p className="text-sm leading-6 text-stone-600">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
          >
            {t("getStarted")}
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-5 py-3 text-sm font-medium hover:bg-stone-100"
          >
            {t("signIn")}
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
