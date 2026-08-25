"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateTime24Input } from "@/components/DateTime24Input";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { Button, Input, Label, Textarea } from "@/components/ui";
import {
  addOneHour,
  dateTimePartsToDate,
  dateToDateTimeParts,
  defaultStartDateTime,
  type DateTimeParts,
} from "@/lib/datetime";
import type { SerializedEvent } from "@/lib/events";

type UserOption = { id: string; name: string; email: string };

function validateSchedule(start: DateTimeParts, end: DateTimeParts): string | null {
  const startsAt = dateTimePartsToDate(start);
  const endsAt = dateTimePartsToDate(end);

  if (!startsAt) {
    return "Start date and time are required.";
  }

  if (endsAt && endsAt <= startsAt) {
    return "End time must be after start time.";
  }

  return null;
}

function EventScheduleFields({
  start,
  end,
  onStartChange,
  onEndChange,
}: {
  start: DateTimeParts;
  end: DateTimeParts;
  onStartChange: (value: DateTimeParts) => void;
  onEndChange: (value: DateTimeParts) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DateTime24Input
        name="startsAt"
        label="Start"
        required
        value={start}
        onChange={onStartChange}
      />
      <DateTime24Input
        name="endsAt"
        label="End"
        required
        value={end}
        onChange={onEndChange}
      />
    </div>
  );
}

export function CreateEventForm({
  participantOptions,
  onSuccess,
  redirectBasePath,
}: {
  participantOptions?: UserOption[];
  onSuccess?: (eventId: string) => void;
  redirectBasePath?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [start, setStart] = useState<DateTimeParts>(defaultStartDateTime);
  const [end, setEnd] = useState<DateTimeParts>(() => addOneHour(defaultStartDateTime()));

  function handleStartChange(nextStart: DateTimeParts) {
    setStart(nextStart);
    setEnd(addOneHour(nextStart));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const validationError = validateSchedule(start, end);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const startsAt = dateTimePartsToDate(start)!;
    const endsAt = dateTimePartsToDate(end);

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        location: location || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
        participantIds:
          selectedParticipantIds.length > 0 ? selectedParticipantIds : undefined,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to create event.");
      return;
    }

    const eventId = data.event.id as string;
    if (redirectBasePath) {
      router.push(`${redirectBasePath}/${eventId}`);
    } else {
      router.refresh();
    }
    onSuccess?.(eventId);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Annual general meeting"
        />
      </div>
      <EventScheduleFields
        start={start}
        end={end}
        onStartChange={handleStartChange}
        onEndChange={setEnd}
      />
      <div>
        <Label htmlFor="event-location">Location</Label>
        <Input
          id="event-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Community hall"
        />
      </div>
      <div>
        <Label htmlFor="event-description">Description</Label>
        <Textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Optional details about this event"
        />
      </div>
      {participantOptions && participantOptions.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-stone-700">
            Participants (optional)
          </legend>
          {participantOptions.map((user) => (
            <label key={user.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedParticipantIds.includes(user.id)}
                onChange={(e) => {
                  setSelectedParticipantIds((current) =>
                    e.target.checked
                      ? [...current, user.id]
                      : current.filter((id) => id !== user.id),
                  );
                }}
                className="rounded border-stone-300"
              />
              {user.name} ({user.email})
            </label>
          ))}
        </fieldset>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create event"}
      </Button>
    </form>
  );
}

export function EditEventForm({ event }: { event: SerializedEvent }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [start, setStart] = useState<DateTimeParts>(() =>
    dateToDateTimeParts(new Date(event.startsAt)),
  );
  const [end, setEnd] = useState<DateTimeParts>(() =>
    event.endsAt
      ? dateToDateTimeParts(new Date(event.endsAt))
      : addOneHour(dateToDateTimeParts(new Date(event.startsAt))),
  );

  function handleStartChange(nextStart: DateTimeParts) {
    setStart(nextStart);
    setEnd(addOneHour(nextStart));
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setLoading(true);
    setError(null);

    const validationError = validateSchedule(start, end);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const startsAt = dateTimePartsToDate(start)!;
    const endsAt = dateTimePartsToDate(end);

    const response = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        location: location || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to update event.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="edit-event-title">Title</Label>
          <Input
            id="edit-event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <EventScheduleFields
          start={start}
          end={end}
          onStartChange={handleStartChange}
          onEndChange={setEnd}
        />
        <div>
          <Label htmlFor="edit-event-location">Location</Label>
          <Input
            id="edit-event-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-event-description">Description</Label>
          <Textarea
            id="edit-event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </form>

      <div className="border-t border-stone-100 pt-4">
        <p className="mb-2 text-sm font-medium text-stone-700">Danger zone</p>
        <DeleteEventButton
          deleteUrl={`/api/events/${event.id}`}
          confirmMessage="Delete this event? This cannot be undone."
          redirectTo="/events"
        />
      </div>
    </div>
  );
}

export function EventParticipantsList({
  eventId,
  participants,
  canEdit,
}: {
  eventId: string;
  participants: UserOption[];
  canEdit: boolean;
}) {
  return (
    <ul className="space-y-2">
      {participants.length === 0 ? (
        <li className="text-sm text-stone-600">No participants assigned yet.</li>
      ) : (
        participants.map((participant) => (
          <li
            key={participant.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2"
          >
            <div>
              <p className="font-medium">{participant.name}</p>
              <p className="text-sm text-stone-500">{participant.email}</p>
            </div>
            {canEdit && (
              <DeleteEventButton
                deleteUrl={`/api/events/${eventId}/participants`}
                deleteBody={{ userId: participant.id }}
                confirmMessage={`Remove ${participant.name} from this event?`}
              />
            )}
          </li>
        ))
      )}
    </ul>
  );
}

export function AssignEventParticipantForm({
  eventId,
  users,
  assignedUserIds,
}: {
  eventId: string;
  users: UserOption[];
  assignedUserIds: string[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableUsers = users.filter((user) => !assignedUserIds.includes(user.id));

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/events/${eventId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to assign participant.");
      return;
    }

    setUserId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="event-participant">Add participant</Label>
        <select
          id="event-participant"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base sm:text-sm"
        >
          <option value="">Select a user</option>
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email})
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || !userId}>
        {loading ? "Adding..." : "Add participant"}
      </Button>
    </form>
  );
}
