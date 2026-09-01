"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EditIconLink } from "@/components/EditIconLink";
import { JoinAsParticipantControls } from "@/components/JoinAsParticipantControls";
import { LeaveEventButton } from "@/components/LeaveEventButton";
import { ParticipatingCheck } from "@/components/ParticipatingCheck";
import { Card, Input, Label } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { isGenericEventKind } from "@/lib/event-type-helpers";
import { isPastDate, matchesSearch } from "@/lib/search";
import type { SerializedEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

export type EventListItem = {
  event: SerializedEvent;
  canEdit: boolean;
  isParticipating: boolean;
  isEventParticipant: boolean;
  hasPendingJoinRequest: boolean;
};

function matchesEventSearch(item: EventListItem, query: string): boolean {
  const { event } = item;
  return matchesSearch(
    query,
    event.title,
    event.displayTitle,
    event.type.name,
    event.description,
    event.notes,
    event.location,
    event.choreographyTitle,
    ...event.choreographies.map((choreography) => choreography.title),
    ...event.participants.map((participant) => participant.name),
    ...event.participants.map((participant) => participant.email),
  );
}

export function EventsList({ events }: { events: EventListItem[] }) {
  const [search, setSearch] = useState("");
  const [hideNonParticipating, setHideNonParticipating] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      if (hideNonParticipating && !item.isParticipating) {
        return false;
      }
      if (!showPast && isPastDate(item.event.startsAt)) {
        return false;
      }
      return matchesEventSearch(item, search);
    });
  }, [events, search, hideNonParticipating, showPast]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <Label htmlFor="event-search">Search</Label>
            <Input
              id="event-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, description, location, or participant…"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col justify-end gap-3 sm:min-w-56">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={hideNonParticipating}
                onChange={(event) => setHideNonParticipating(event.target.checked)}
                className="rounded border-stone-300"
              />
              Hide events I&apos;m not in
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={showPast}
                onChange={(event) => setShowPast(event.target.checked)}
                className="rounded border-stone-300"
              />
              Show past events
            </label>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-500">
          {filteredEvents.length} of {events.length} events
        </p>
      </div>

      {filteredEvents.length === 0 ? (
        <Card>
          <p className="text-stone-600">No events match your search or filters.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map(({ event, canEdit, isParticipating, isEventParticipant, hasPendingJoinRequest }) => (
            <Card
              key={event.id}
              className={cn(
                "relative transition hover:border-stone-400",
                isEventParticipant && "pb-10",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    {event.type.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Link href={`/events/${event.id}`} className="hover:underline">
                      <h2 className="text-lg font-semibold">{event.displayTitle}</h2>
                    </Link>
                    {isParticipating && <ParticipatingCheck />}
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatDateTime(new Date(event.startsAt))}
                    {event.endsAt && ` – ${formatDateTime(new Date(event.endsAt))}`}
                  </p>
                  {event.location && (
                    <p className="mt-1 text-sm text-stone-500">{event.location}</p>
                  )}
                  {event.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-stone-600">
                      {event.description}
                    </p>
                  )}
                  {!isParticipating && (
                    <p className="mt-2 text-xs font-medium text-stone-500">
                      Not participating
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-3 text-sm text-stone-600">
                  <p>
                    {event.participants.length}{" "}
                    {event.participants.length === 1 ? "participant" : "participants"}
                  </p>
                  {canEdit && (
                    <EditIconLink href={`/events/${event.id}`} label="Edit event" />
                  )}
                </div>
              </div>
              {isGenericEventKind(event.type.kind) &&
                !isEventParticipant &&
                (event.allowParticipantJoin ||
                  event.allowJoinRequests ||
                  hasPendingJoinRequest) && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <JoinAsParticipantControls
                    joinUrl={`/api/events/${event.id}/join`}
                    requestUrl={`/api/events/${event.id}/join-requests`}
                    allowJoin={event.allowParticipantJoin}
                    allowRequest={event.allowJoinRequests}
                    isParticipant={isEventParticipant}
                    hasPendingRequest={hasPendingJoinRequest}
                  />
                </div>
              )}
              {isEventParticipant && (
                <LeaveEventButton
                  eventId={event.id}
                  eventTitle={event.displayTitle}
                  className="absolute right-2 bottom-2"
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
