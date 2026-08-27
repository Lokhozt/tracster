"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EditIconLink } from "@/components/EditIconLink";
import { Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/datetime";
import {
  filterUpcomingScheduleEvents,
  type UpcomingEventRange,
} from "@/lib/schedule-filters";
import type { SerializedScheduleEvent } from "@/lib/schedule";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";

const statusLabels = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  MAYBE: "Maybe",
} as const;

const eventTypeLabels = {
  repetition: "Repetition",
  representation: "Representation",
  event: "Event",
} as const;

function EventTypeBadge({ type }: { type: SerializedScheduleEvent["type"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        type === "repetition"
          ? "bg-stone-100 text-stone-700"
          : type === "representation"
            ? "bg-amber-100 text-amber-900"
            : "bg-sky-100 text-sky-900",
      )}
    >
      {eventTypeLabels[type]}
    </span>
  );
}

function AvailabilityBadge({
  status,
}: {
  status: SerializedScheduleEvent["availabilityStatus"];
}) {
  if (!status) {
    return (
      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
        No response
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
      {statusLabels[status]}
    </span>
  );
}

function AvailabilityQuickReply({
  repetitionId,
  currentStatus,
}: {
  repetitionId: string;
  currentStatus: SerializedScheduleEvent["availabilityStatus"];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<AvailabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitStatus(status: AvailabilityStatus) {
    setLoading(status);
    setError(null);

    const response = await fetch(`/api/repetitions/${repetitionId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    setLoading(null);

    if (!response.ok) {
      setError(data.error ?? "Unable to save availability.");
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
          {loading === "AVAILABLE" ? "Saving..." : "Available"}
        </Button>
        <Button
          type="button"
          variant={currentStatus === "UNAVAILABLE" ? "primary" : "secondary"}
          disabled={loading !== null}
          onClick={() => submitStatus("UNAVAILABLE")}
        >
          {loading === "UNAVAILABLE" ? "Saving..." : "Unavailable"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function defaultEventTitle(event: SerializedScheduleEvent) {
  if (event.title) {
    return event.title;
  }

  if (event.type === "representation") {
    return "Representation";
  }
  if (event.type === "event") {
    return "Event";
  }
  return "Repetition";
}

const rangeOptions: Array<{ value: UpcomingEventRange; label: string }> = [
  { value: "all", label: "All events" },
  { value: "week", label: "Next Week" },
  { value: "month", label: "Next Month" },
];

export function UpcomingEventsList({
  events,
}: {
  events: SerializedScheduleEvent[];
}) {
  const [range, setRange] = useState<UpcomingEventRange>("all");
  const [hideNonParticipating, setHideNonParticipating] = useState(false);

  const filteredEvents = useMemo(
    () => filterUpcomingScheduleEvents(events, { range, hideNonParticipating }),
    [events, range, hideNonParticipating],
  );

  const filtersActive = range !== "all" || hideNonParticipating;

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Upcoming events</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-stone-300 p-0.5">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  range === option.value
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100",
                )}
              >
                {option.label}
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
            Hide events I&apos;m not participating in
          </label>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <p className="text-stone-600">No upcoming events scheduled.</p>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <p className="text-stone-600">
            {filtersActive
              ? "No upcoming events match your filters."
              : "No upcoming events scheduled."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card key={`${event.type}-${event.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {event.choreographyTitle && (
                      <p className="text-sm font-medium text-stone-500">
                        {event.choreographyTitle}
                      </p>
                    )}
                    <EventTypeBadge type={event.type} />
                  </div>
                  <Link href={event.href} className="text-base font-semibold hover:underline">
                    {defaultEventTitle(event)}
                  </Link>
                  <p className="text-sm text-stone-600">
                    {formatDateTime(new Date(event.startsAt))}
                    {event.endsAt && ` – ${formatDateTime(new Date(event.endsAt))}`}
                  </p>
                  {event.location && (
                    <p className="text-sm text-stone-500">{event.location}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {event.type === "repetition" && event.isMember && (
                    <AvailabilityBadge status={event.availabilityStatus} />
                  )}
                  {event.canEdit && (
                    <EditIconLink
                      href={event.href}
                      label={`Edit ${eventTypeLabels[event.type].toLowerCase()}`}
                    />
                  )}
                </div>
              </div>

              {event.type === "repetition" && event.isMember && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <AvailabilityQuickReply
                    repetitionId={event.id}
                    currentStatus={event.availabilityStatus}
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
