import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActivityPeriodSwitch } from "@/components/ActivityPeriodSwitch";
import { AppShell } from "@/components/AppShell";
import { ChevronRightIcon } from "@/components/icons";
import { LocalDateTime } from "@/components/LocalDateTime";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDurationMinutes } from "@/lib/format-duration";
import { eventCategoryClassName } from "@/lib/event-category-filter";
import { filterEventTypesForViewer } from "@/lib/event-type-helpers";
import { getEventTypes } from "@/lib/event-types";
import {
  type ActivityMonth,
  type ActivityPeriod,
  loadMyActivity,
} from "@/lib/my-activity";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

const SECTION_TITLE_CLASS = "mb-3 text-sm font-semibold text-stone-500";

export default async function ActivityPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const period: ActivityPeriod = params.period === "all" ? "all" : "season";
  const [t, locale, activity, dancingCount, leadingCount, eventTypes] = await Promise.all([
    getTranslations("Pages.Activity"),
    getLocale(),
    loadMyActivity(user.id, period),
    prisma.choreographyMember.count({
      where: { userId: user.id, choreography: { archivedAt: null } },
    }),
    prisma.choreography.count({
      where: {
        archivedAt: null,
        OR: [{ createdById: user.id }, { choreographers: { some: { userId: user.id } } }],
      },
    }),
    getEventTypes(),
  ]);

  const { rehearsals } = activity;
  const rehearsalsCounted = rehearsals.attended + rehearsals.missed;
  const attendanceRate =
    rehearsalsCounted > 0 ? Math.round((rehearsals.attended / rehearsalsCounted) * 100) : null;
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
  // The association's event types, as in the planning filter (rehearsals have their own card).
  // Types the viewer cannot join (competitions for non-competitors) only show once counted.
  const joinableTypeIds = new Set(
    filterEventTypesForViewer(eventTypes, { isCompetitor: user.isCompetitor, seesAllEvents: false }).map(
      (type) => type.id,
    ),
  );
  const tiles = [
    ...eventTypes
      .filter((type) => type.kind !== "REHEARSAL")
      .map((type) => ({
        key: type.id,
        label: type.name,
        kind: type.kind,
        value: activity.countsByTypeId[type.id] ?? 0,
      }))
      .filter((tile) => tile.value > 0 || joinableTypeIds.has(tile.key)),
    { key: "bar", label: t("barSlots"), kind: null, value: activity.barSlotsHeld },
  ];

  return (
    <AppShell title={t("title")}>
      <div className="max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <ActivityPeriodSwitch period={period} />
          <p className="text-sm text-stone-500">
            {activity.periodStart
              ? t("seasonSince", { date: dateFormat.format(new Date(activity.periodStart)) })
              : t("allTime")}
          </p>
        </div>

        <Card>
          <h2 className={SECTION_TITLE_CLASS}>{t("rehearsals")}</h2>
          {rehearsalsCounted === 0 ? (
            <p className="text-stone-600">{t("noRehearsals")}</p>
          ) : (
            <>
              <p className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold tabular-nums text-stone-900">
                  {rehearsals.attended}
                </span>
                <span className="text-stone-600">
                  {t("rehearsalsAttended", { count: rehearsals.attended })}
                </span>
              </p>
              {attendanceRate !== null && (
                <div className="mt-3">
                  <div
                    className="h-2 overflow-hidden rounded-full bg-stone-200"
                    role="img"
                    aria-label={t("attendanceRate", { rate: attendanceRate })}
                  >
                    <div
                      className="h-full rounded-full bg-stone-900"
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-stone-600">
                    <span className="font-medium text-stone-900">
                      {t("attendanceRate", { rate: attendanceRate })}
                    </span>
                    <span>
                      {t("rehearsalHours", {
                        hours: formatDurationMinutes(rehearsals.minutesAttended),
                      })}
                    </span>
                    <span>{t("rehearsalsMissed", { count: rehearsals.missed })}</span>
                  </p>
                </div>
              )}
            </>
          )}
        </Card>

        <section aria-labelledby="activity-events">
          <h2 id="activity-events" className={cn(SECTION_TITLE_CLASS, "px-1")}>
            {t("eventsTitle")}
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map((tile) => (
              <li
                key={tile.key}
                className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <span
                  className={cn(
                    "font-display text-3xl font-bold tabular-nums",
                    tile.value === 0 ? "text-stone-400" : "text-stone-900",
                  )}
                >
                  {tile.value}
                </span>
                {tile.kind ? (
                  <span
                    className={cn(
                      "inline-flex max-w-full items-center gap-1.5 self-start rounded-full border px-2 py-0.5 text-xs font-medium",
                      eventCategoryClassName(tile.kind),
                    )}
                  >
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
                    <span className="truncate">{tile.label}</span>
                  </span>
                ) : (
                  <span className="text-sm text-stone-600">{tile.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <Card>
          <h2 className="text-sm font-semibold text-stone-500">{t("monthsTitle")}</h2>
          <p className="mb-4 text-sm text-stone-600">{t("monthsCaption")}</p>
          <MonthChart months={activity.months} locale={locale} />
        </Card>

        <Card className="flex items-center justify-between gap-3 py-3 sm:py-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-500">{t("choreographiesTitle")}</h2>
            <p className="text-stone-900">
              {t("dancing", { count: dancingCount })}
              {leadingCount > 0 && <> · {t("leading", { count: leadingCount })}</>}
            </p>
          </div>
          <Link
            href="/choreographies"
            aria-label={t("choreographiesTitle")}
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100"
          >
            <ChevronRightIcon />
          </Link>
        </Card>

        <Card>
          <h2 className={SECTION_TITLE_CLASS}>{t("upcomingTitle")}</h2>
          {activity.upcoming.length === 0 ? (
            <p className="text-stone-600">{t("upcomingEmpty")}</p>
          ) : (
            <ul className="-mx-2 divide-y divide-stone-100">
              {activity.upcoming.map((event) => (
                <li key={event.id}>
                  <Link
                    href={event.href}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-stone-100"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-stone-900">
                        {event.title || event.choreographyTitle || event.typeName}
                      </span>
                      <span className="block text-sm text-stone-600">
                        {event.typeName} · <LocalDateTime value={event.startsAt} />
                      </span>
                    </span>
                    <ChevronRightIcon />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-stone-900 underline-offset-4 hover:underline"
          >
            {activity.upcomingCount > activity.upcoming.length
              ? t("upcomingMore", { count: activity.upcomingCount - activity.upcoming.length })
              : t("openPlanning")}
          </Link>
        </Card>

        <p className="px-1 text-xs text-stone-500">{t("declaredNote")}</p>
      </div>
    </AppShell>
  );
}

async function MonthChart({ months, locale }: { months: ActivityMonth[]; locale: string }) {
  const t = await getTranslations("Pages.Activity");
  const shortMonth = new Intl.DateTimeFormat(locale, { month: "short" });
  // "sept." → "sept": the dot only costs width under a narrow bar.
  const shortMonthLabel = (date: Date) => shortMonth.format(date).replace(/\.$/, "");
  const longMonth = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const max = Math.max(1, ...months.map((entry) => entry.count));
  const peakIndex = months.findIndex((entry) => entry.count === max);

  return (
    <>
      <div aria-hidden="true" className="flex h-36 items-end gap-0.5 border-b border-stone-200 pt-5">
        {months.map((entry, index) => {
          const label = t("monthBar", {
            month: longMonth.format(new Date(entry.month)),
            count: entry.count,
          });
          return (
            <div key={entry.month} title={label} className="flex h-full flex-1 items-end justify-center">
              <div
                className={cn(
                  "relative w-full max-w-8 rounded-t",
                  entry.count > 0 ? "bg-stone-900" : "bg-transparent",
                )}
                style={{ height: `${(entry.count / max) * 100}%` }}
              >
                {/* One direct label, on the busiest month; the others show on hover. */}
                {index === peakIndex && entry.count > 0 && (
                  <span className="absolute inset-x-0 bottom-full mb-1 text-center text-xs font-medium tabular-nums text-stone-600">
                    {entry.count}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-1 flex gap-0.5">
        {months.map((entry, index) => (
          <span
            key={entry.month}
            className={cn(
              "min-w-0 flex-1 text-center text-xs text-stone-500 capitalize",
              // Phones: a year of short names does not fit, so every other month is named.
              months.length > 8 && (months.length - 1 - index) % 2 === 1 && "max-sm:invisible",
            )}
          >
            {shortMonthLabel(new Date(entry.month))}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">{t("monthColumn")}</th>
            <th scope="col">{t("countColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {months.map((entry) => (
            <tr key={entry.month}>
              <th scope="row">{longMonth.format(new Date(entry.month))}</th>
              <td>{entry.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
