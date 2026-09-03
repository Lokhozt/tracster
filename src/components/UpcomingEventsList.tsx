"use client";

import { useLocale, useTranslations } from "next-intl";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EditIconLink } from "@/components/EditIconLink";
import { JoinAsParticipantControls } from "@/components/JoinAsParticipantControls";
import { ParticipatingCheck } from "@/components/ParticipatingCheck";
import { Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

import {
  filterUpcomingScheduleEvents,
  type UpcomingEventRange,
} from "@/lib/schedule-filters";
import {
  isGenericScheduleEvent,
  isRehearsalScheduleEvent,
  scheduleEventLabel,
  type SerializedScheduleEvent,
} from "@/lib/schedule-filters";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";


function eventKindClassName(kind: SerializedScheduleEvent["typeKind"]) {
  if (kind === "REPRESENTATION") {
    return "bg-amber-100 text-amber-900";
  }
  if (kind === "COMPETITION") {
    return "bg-violet-100 text-violet-900";
  }
  if (kind === "DEMONSTRATION") {
    return "bg-teal-100 text-teal-900";
  }
  if (kind === "FESTIVAL") {
    return "bg-rose-100 text-rose-900";
  }
  if (kind === "REHEARSAL") {
    return "bg-stone-100 text-stone-700";
  }
  return "bg-sky-100 text-sky-900";
}

function EventTypeBadge({ event }: { event: SerializedScheduleEvent }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", eventKindClassName(event.typeKind))}>
      {event.typeName}
    </span>
  );
}

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

function AvailabilityQuickReply({
  rehearsalId,
  currentStatus,
}: {
  rehearsalId: string;
  currentStatus: SerializedScheduleEvent["availabilityStatus"];
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState<AvailabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitStatus(status: AvailabilityStatus) {
    setLoading(status);
    setError(null);

    const response = await fetch(`/api/events/${rehearsalId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    setLoading(null);

    if (!response.ok) {
      setError(data.error ?? t("availabilitySaveError"));
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={currentStatus === "AVAILABLE" ? "primary" : "secondary"}
          disabled={loading !== null}
          onClick={() => submitStatus("AVAILABLE")}
        >
          {loading === "AVAILABLE" ? t("saving") : t("statusAVAILABLE")}
        </Button>
        <Button
          type="button"
          variant={currentStatus === "UNAVAILABLE" ? "primary" : "secondary"}
          disabled={loading !== null}
          onClick={() => submitStatus("UNAVAILABLE")}
        >
          {loading === "UNAVAILABLE" ? t("saving") : t("statusUNAVAILABLE")}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function defaultEventTitle(event: SerializedScheduleEvent) {
  return scheduleEventLabel(event);
}

const rangeOptions: UpcomingEventRange[] = ["all", "week", "month"];

export function UpcomingEventsList({
  events,
}: {
  events: SerializedScheduleEvent[];
}) {
  const t = useTranslations("Components");
  const [range, setRange] = useState<UpcomingEventRange>("all");
  const locale = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"});
  const [hideNonParticipating, setHideNonParticipating] = useState(false);

  const filteredEvents = useMemo(
    () => filterUpcomingScheduleEvents(events, { range, hideNonParticipating }),
    [events, range, hideNonParticipating],
  );

  const filtersActive = range !== "all" || hideNonParticipating;

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{t("upcomingEvents")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-stone-300 p-0.5">
            {rangeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  range === option
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100",
                )}
              >
                {t(`range${option}`)}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={hideNonParticipating}
              onChange={(event) => setHideNonParticipating(event.target.checked)}
              className="rounded border-stone-300"
            />
            {t("hideNonParticipatingEvents")}
          </label>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <p className="text-stone-600">{t("noUpcomingEvents")}</p>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <p className="text-stone-600">
            {filtersActive
              ? t("noUpcomingFilterMatches")
              : t("noUpcomingEvents")}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card key={event.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {event.choreographyTitle && (
                      <p className="text-sm font-medium text-stone-500">
                        {event.choreographyTitle}
                      </p>
                    )}
                    <EventTypeBadge event={event} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={event.href} className="text-base font-semibold hover:underline">
                      {defaultEventTitle(event)}
                    </Link>
                    {event.isParticipating && <ParticipatingCheck />}
                  </div>
                  <p className="text-sm text-stone-600">
                    {dateFormatter.format(new Date(event.startsAt))}
                    {event.endsAt && ` – ${dateFormatter.format(new Date(event.endsAt))}`}
                  </p>
                  {event.location && (
                    <p className="text-sm text-stone-500">{event.location}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isRehearsalScheduleEvent(event) && event.isMember && (
                    <AvailabilityBadge status={event.availabilityStatus} />
                  )}
                  {event.canEdit && (
                    <EditIconLink
                      href={event.href}
                      label={t("editNamed", {name: event.typeName.toLocaleLowerCase(locale)})}
                    />
                  )}
                </div>
              </div>

              {isRehearsalScheduleEvent(event) && event.isMember && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <AvailabilityQuickReply
                    rehearsalId={event.id}
                    currentStatus={event.availabilityStatus}
                  />
                </div>
              )}
              {isGenericScheduleEvent(event) &&
                !event.isEventParticipant &&
                (event.allowParticipantJoin ||
                  event.allowJoinRequests ||
                  event.hasPendingJoinRequest) && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <JoinAsParticipantControls
                    joinUrl={`/api/events/${event.id}/join`}
                    requestUrl={`/api/events/${event.id}/join-requests`}
                    allowJoin={event.allowParticipantJoin}
                    allowRequest={event.allowJoinRequests}
                    isParticipant={event.isEventParticipant}
                    hasPendingRequest={event.hasPendingJoinRequest}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
