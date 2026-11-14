"use client";

import { useLocale, useTranslations } from "next-intl";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AvailabilityButtons } from "@/components/AvailabilityButtons";
import { JoinAsParticipantControls } from "@/components/JoinAsParticipantControls";
import { ParticipationStatus } from "@/components/ParticipationStatus";
import { EventCard } from "@/components/EventCard";
import { Card, Button } from "@/components/ui";
import { aboveCardLink, cardLink, cn } from "@/lib/utils";

import {
  isScheduleEventHappeningNow,
  scheduleEventEnd,
} from "@/lib/schedule-filters";
import { isBirthdayScheduleEvent } from "@/lib/schedule-birthdays";
import { PARTY_BAR_SLOT_COUNT } from "@/lib/event-type-helpers";
import {
  isGenericScheduleEvent,
  isRehearsalScheduleEvent,
  scheduleEventLabel,
  type SerializedScheduleEvent,
} from "@/lib/schedule-filters";




function AvailabilityBadge({
  status,
}: {
  status: SerializedScheduleEvent["availabilityStatus"];
}) {
  const t = useTranslations("Components");
  if (!status) {
    return (
      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
        {t("noResponse")}
      </span>
    );
  }

  const styles = {
    AVAILABLE: "bg-green-100 text-green-800",
    UNAVAILABLE: "bg-red-100 text-red-800",
    MAYBE: "bg-amber-100 text-amber-800",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {t(`status${status}`)}
    </span>
  );
}


/**
 * Bar state of a party, on its row: "✓ Au bar" when you hold a slot, else "Bar 2/3" (amber
 * while a slot is free). With `showSignup` ("Places libres"), a button takes a slot directly,
 * so the bar sign-up is not confused with attending the party ("Participer").
 */
function BarSlotRow({
  event,
  showSignup,
}: {
  event: SerializedScheduleEvent;
  showSignup: boolean;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function takeSlot() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${event.id}/bar-slots`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? t("barTakeSlotError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("barTakeSlotError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("mt-2 flex flex-wrap items-center gap-2", aboveCardLink)}>
      {event.isBarVolunteer ? (
        <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-semibold text-white">
          {t("barChipMine")}
        </span>
      ) : (
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
            event.hasFreeBarSlot ? "bg-spotlight text-spotlight-ink" : "bg-stone-100 text-stone-600",
          )}
        >
          {t("barChip", { filled: event.barSlotsFilled ?? 0, total: PARTY_BAR_SLOT_COUNT })}
        </span>
      )}
      {showSignup && event.hasFreeBarSlot && !event.isBarVolunteer && (
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void takeSlot()}>
          {saving ? t("saving") : t("barTakeSlot")}
        </Button>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function defaultEventTitle(event: SerializedScheduleEvent) {
  return scheduleEventLabel(event);
}

const UPCOMING_PAGE_SIZE = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Events the viewer can join, request, or leave get a participation pill on their card. */
function hasJoinPill(event: SerializedScheduleEvent): boolean {
  return (
    isGenericScheduleEvent(event) &&
    (event.isEventParticipant ||
      event.allowParticipantJoin ||
      event.allowJoinRequests ||
      event.hasPendingJoinRequest)
  );
}

/**
 * Time of a row under its day ("17:00 – 18:30", "22:30 – 01:30"); an event lasting a day or
 * more shows its end date.
 */
function timeRange(
  startsAt: string,
  endsAt: string | null,
  dayFormatter: Intl.DateTimeFormat,
  timeFormatter: Intl.DateTimeFormat,
): string {
  const start = new Date(startsAt);
  const startLabel = timeFormatter.format(start);
  if (!endsAt) {
    return startLabel;
  }
  const end = new Date(endsAt);
  const endLabel =
    end.getTime() - start.getTime() < DAY_MS ? timeFormatter.format(end) : dayFormatter.format(end);
  return `${startLabel} – ${endLabel}`;
}

type DayGroup = {
  key: string;
  day: Date;
  isToday: boolean;
  events: SerializedScheduleEvent[];
};

/**
 * Consecutive events of the same local day (the list is already in display order). The first
 * past event always starts a new group, under the "past" heading.
 */
function groupByDay(events: SerializedScheduleEvent[], firstPastEventId?: string): DayGroup[] {
  const todayKey = new Date().toDateString();
  const groups: DayGroup[] = [];
  for (const event of events) {
    const start = new Date(event.startsAt);
    const key = start.toDateString();
    const last = groups.at(-1);
    if (last && last.key === key && event.id !== firstPastEventId) {
      last.events.push(event);
    } else {
      groups.push({ key, day: start, isToday: key === todayKey, events: [event] });
    }
  }
  return groups;
}

export function UpcomingEventsList({
  events,
  categoriesFiltered = false,
  includePast = false,
  showBarSignup = false,
  mineOnly = false,
}: {
  events: SerializedScheduleEvent[];
  categoriesFiltered?: boolean;
  /** "Places libres": a "take a slot" button right on the party rows. */
  showBarSignup?: boolean;
  /** Only the viewer's events are shown (for the empty message). */
  mineOnly?: boolean;
  /** Also list finished events, most recent first, under a "past" heading. */
  includePast?: boolean;
}) {
  const t = useTranslations("Components");
  const [now, setNow] = useState(() => new Date());
  const locale = useLocale();
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeEvents = useMemo(
    () => events.filter((event) => scheduleEventEnd(event) > now),
    [events, now],
  );
  const pastEvents = useMemo(
    () =>
      includePast
        ? events
            .filter((event) => scheduleEventEnd(event) <= now)
            .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
        : [],
    [events, includePast, now],
  );
  const filteredEvents = useMemo(() => [...activeEvents, ...pastEvents], [activeEvents, pastEvents]);
  const firstPastEventId = pastEvents[0]?.id;
  const listKey = filteredEvents.map((event) => event.id).join("|");
  const [scrollWindow, setScrollWindow] = useState({
    listKey,
    visibleCount: UPCOMING_PAGE_SIZE,
  });
  if (scrollWindow.listKey !== listKey) {
    setScrollWindow({ listKey, visibleCount: UPCOMING_PAGE_SIZE });
  }
  const visibleCount =
    scrollWindow.listKey === listKey ? scrollWindow.visibleCount : UPCOMING_PAGE_SIZE;
  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestingMore = useRef(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) {
      return;
    }

    requestingMore.current = false;
    const observer = new IntersectionObserver((entries) => {
      if (requestingMore.current || !entries.some((entry) => entry.isIntersecting)) {
        return;
      }
      requestingMore.current = true;
      setScrollWindow((current) => {
        if (current.listKey !== listKey) {
          return { listKey, visibleCount: UPCOMING_PAGE_SIZE };
        }
        return {
          listKey,
          visibleCount: Math.min(
            current.visibleCount + UPCOMING_PAGE_SIZE,
            filteredEvents.length,
          ),
        };
      });
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredEvents.length, hasMore, listKey, visibleCount]);

  const filtersActive = categoriesFiltered;

  return (
    <section className="@container">
      <h2 className="mb-3 text-lg font-semibold">{t("upcomingEvents")}</h2>

      {events.length === 0 && !filtersActive ? (
        <Card>
          <p className="text-stone-600">{t("noUpcomingEvents")}</p>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <p className="text-stone-600">
            {mineOnly
              ? t("noUpcomingMine")
              : filtersActive
                ? t("noUpcomingFilterMatches")
                : t("noUpcomingEvents")}
          </p>
        </Card>
      ) : (
        // Call sheet: one group per day, the day number in a gutter on the left; the rows of
        // that day on the right (two columns only when the list itself is wide).
        <div className="space-y-5">
          {groupByDay(visibleEvents, firstPastEventId).map((group) => (
            <Fragment key={`${group.key}-${group.events[0].id}`}>
              {group.events[0].id === firstPastEventId && (
                <h2 className="text-lg font-semibold">{t("pastEventsHeading")}</h2>
              )}
              <div className="flex gap-3">
                <div className="w-11 shrink-0 pt-0.5 text-center" suppressHydrationWarning>
                  <p
                    className={cn(
                      "inline-block font-display text-3xl leading-none tabular-nums",
                      group.isToday && "border-b-4 border-spotlight pb-0.5",
                    )}
                  >
                    {group.day.getDate()}
                  </p>
                  <p className="mt-1 text-xs font-medium text-stone-500">
                    {weekdayFormatter.format(group.day)}
                  </p>
                </div>
                <div className="grid min-w-0 flex-1 gap-2 @2xl:has-[>:nth-child(2)]:grid-cols-2">
                  {group.events.map((event) => (
              <EventCard key={event.id} kind={event.typeKind} className="relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-semibold tabular-nums text-stone-900" suppressHydrationWarning>
                        {timeRange(event.startsAt, event.endsAt, dayFormatter, timeFormatter)}
                      </span>
                      {/* Rehearsals are often titled by their type: no "Répétition" twice. */}
                      {event.typeName !== defaultEventTitle(event) && (
                        <span className="text-stone-500">{event.typeName}</span>
                      )}
                      {isScheduleEventHappeningNow(event, now) && (
                        <span className="font-semibold text-emerald-700">{t("rightNow")}</span>
                      )}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
                      {event.href ? (
                        <Link
                          href={event.href}
                          className={cn("text-base font-semibold hover:underline", cardLink)}
                        >
                          {defaultEventTitle(event)}
                        </Link>
                      ) : (
                        <span className="text-base font-semibold">{defaultEventTitle(event)}</span>
                      )}
                      {!isBirthdayScheduleEvent(event) && !hasJoinPill(event) && (
                        <ParticipationStatus
                          participating={event.isParticipating}
                          choreographer={event.isChoreographer}
                        />
                      )}
                    </div>
                    {(event.choreographyTitle || event.location) && (
                      <p className="mt-0.5 text-sm text-stone-600">
                        {[event.choreographyTitle, event.groupName, event.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  {isRehearsalScheduleEvent(event) && event.isMember && (
                    <div className={cn("shrink-0", aboveCardLink)}>
                      <AvailabilityBadge status={event.availabilityStatus} />
                    </div>
                  )}
                  {/* Join/leave pill: shows the participation state and toggles it. */}
                  {hasJoinPill(event) && (
                    <div className={cn("shrink-0", aboveCardLink)}>
                      <JoinAsParticipantControls
                        joinUrl={`/api/events/${event.id}/join`}
                        requestUrl={`/api/events/${event.id}/join-requests`}
                        allowJoin={event.allowParticipantJoin}
                        allowRequest={event.allowJoinRequests}
                        allowLeave
                        isParticipant={event.isEventParticipant}
                        hasPendingRequest={event.hasPendingJoinRequest}
                        hasUpcomingSeries={event.hasUpcomingSeriesEvents}
                      />
                    </div>
                  )}
                </div>

                {event.barSlotsFilled !== null && (
                  <BarSlotRow event={event} showSignup={showBarSignup} />
                )}
                {isRehearsalScheduleEvent(event) && event.isMember && (
                  <div className={cn("mt-3 border-t border-stone-100 pt-3", aboveCardLink)}>
                    <AvailabilityButtons
                      rehearsalId={event.id}
                      currentStatus={event.availabilityStatus}
                    />
                  </div>
                )}
              </EventCard>
                  ))}
                </div>
              </div>
            </Fragment>
          ))}
          {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-px" />}
        </div>
      )}
    </section>
  );
}
