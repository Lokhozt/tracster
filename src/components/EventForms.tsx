"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DateTime24Input } from "@/components/DateTime24Input";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { EditIconLink } from "@/components/EditIconLink";
import {
  emptyLocationSelection,
  LocationPicker,
  locationPayload,
  selectionFromRecord,
  type LocationSelection,
} from "@/components/LocationPicker";
import { ParticipantConflictWarnings } from "@/components/ParticipantConflictWarnings";
import { RepetitionAudienceSelect, type GroupOption } from "@/components/GroupForms";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { ParticipationSettingsFields } from "@/components/ParticipationSettingsFields";
import {
  addOneHour,
  dateTimePartsToDate,
  dateToDateTimeParts,
  defaultStartDateTime,
  formatDateTime,
  type DateTimeParts,
} from "@/lib/datetime";
import {
  eventKindAllowsChoreographyLinks,
  isGenericEventKind,
  type SerializedEventType,
} from "@/lib/event-type-helpers";
import type { SerializedEvent } from "@/lib/events";
import {
  defaultParticipationSettings,
  type ParticipationSettings,
} from "@/lib/participation";

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

type ChoreographyOption = { id: string; title: string };

function selectedEventType(eventTypes: SerializedEventType[], typeId: string) {
  return eventTypes.find((type) => type.id === typeId) ?? eventTypes[0];
}

export function CreateEventForm({
  eventTypes,
  participantOptions,
  choreographyOptions,
  groups = [],
  defaultTypeId,
  lockType = false,
  defaultChoreographyId,
  lockChoreography = false,
  onSuccess,
  redirectBasePath,
}: {
  eventTypes: SerializedEventType[];
  participantOptions?: UserOption[];
  choreographyOptions?: ChoreographyOption[];
  groups?: GroupOption[];
  defaultTypeId?: string;
  lockType?: boolean;
  defaultChoreographyId?: string;
  lockChoreography?: boolean;
  onSuccess?: (eventId: string) => void;
  redirectBasePath?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeId, setTypeId] = useState(defaultTypeId ?? eventTypes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [locationSelection, setLocationSelection] = useState<LocationSelection>(
    emptyLocationSelection,
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [choreographyId, setChoreographyId] = useState(defaultChoreographyId ?? "");
  const [selectedChoreographyIds, setSelectedChoreographyIds] = useState<string[]>(
    defaultChoreographyId ? [defaultChoreographyId] : [],
  );
  const [audience, setAudience] = useState("");
  const [fetchedGroups, setFetchedGroups] = useState<GroupOption[]>([]);
  const [participation, setParticipation] = useState<ParticipationSettings>(
    defaultParticipationSettings,
  );
  const [start, setStart] = useState<DateTimeParts>(defaultStartDateTime);
  const [end, setEnd] = useState<DateTimeParts>(() => addOneHour(defaultStartDateTime()));

  const eventType = selectedEventType(eventTypes, typeId);
  const generic = isGenericEventKind(eventType?.kind ?? null);
  const allowsChoreographyLinks = eventKindAllowsChoreographyLinks(eventType?.kind ?? null);
  const groupOptions = groups.length > 0 ? groups : fetchedGroups;

  useEffect(() => {
    if (eventType?.kind !== "REPETITION" || !choreographyId || groups.length > 0) {
      return;
    }

    let cancelled = false;
    async function loadGroups() {
      const response = await fetch(`/api/choreographies/${choreographyId}/groups`);
      const data = await response.json();
      if (!cancelled && response.ok) {
        setFetchedGroups(
          (data.groups ?? []).map((group: { id: string; name: string; members: unknown[] }) => ({
            id: group.id,
            name: group.name,
            memberCount: group.members.length,
          })),
        );
      }
    }

    void loadGroups();
    return () => {
      cancelled = true;
    };
  }, [choreographyId, eventType?.kind, groups.length]);

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
        typeId,
        title: title || undefined,
        description: generic ? description || undefined : undefined,
        notes: generic ? undefined : notes || undefined,
        ...locationPayload(locationSelection),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
        participantIds:
          generic && selectedParticipantIds.length > 0
            ? selectedParticipantIds
            : undefined,
        choreographyId:
          eventType?.kind === "REPETITION" ? choreographyId || null : null,
        choreographyIds: allowsChoreographyLinks ? selectedChoreographyIds : undefined,
        groupId: eventType?.kind === "REPETITION" ? audience || undefined : undefined,
        ...(generic ? participation : {}),
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
        <Label htmlFor="event-type">Type</Label>
        <Select
          id="event-type"
          className="mt-1 block w-full"
          value={typeId}
          disabled={lockType}
          onChange={(event) => setTypeId(event.target.value)}
        >
          {eventTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required={generic}
          placeholder={eventType?.name ?? "Event"}
        />
      </div>
      <EventScheduleFields
        start={start}
        end={end}
        onStartChange={handleStartChange}
        onEndChange={setEnd}
      />
      <LocationPicker
        id="event-location"
        value={locationSelection}
        onChange={setLocationSelection}
      />
      {eventType?.kind === "REPETITION" && choreographyOptions && (
        <div>
          <Label htmlFor="event-choreography">Choreography</Label>
          <Select
            id="event-choreography"
            className="mt-1 block w-full"
            value={choreographyId}
            disabled={lockChoreography}
            onChange={(event) => {
              setChoreographyId(event.target.value);
              setAudience("");
            }}
          >
            <option value="">None</option>
            {choreographyOptions.map((choreography) => (
              <option key={choreography.id} value={choreography.id}>
                {choreography.title}
              </option>
            ))}
          </Select>
        </div>
      )}
      {eventType?.kind === "REPETITION" && choreographyId && (
        <>
          <RepetitionAudienceSelect
            groups={groupOptions}
            value={audience}
            onChange={setAudience}
          />
          <ParticipantConflictWarnings
            choreographyId={choreographyId}
            startsAt={dateTimePartsToDate(start)}
            endsAt={dateTimePartsToDate(end)}
            groupId={audience}
          />
        </>
      )}
      {allowsChoreographyLinks && choreographyOptions && choreographyOptions.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-stone-700">
            Link to choreographies (optional)
          </legend>
          {choreographyOptions.map((choreography) => (
            <label key={choreography.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedChoreographyIds.includes(choreography.id)}
                disabled={lockChoreography && choreography.id === defaultChoreographyId}
                onChange={(event) => {
                  setSelectedChoreographyIds((current) =>
                    event.target.checked
                      ? [...current, choreography.id]
                      : current.filter((id) => id !== choreography.id),
                  );
                }}
                className="rounded border-stone-300"
              />
              {choreography.title}
            </label>
          ))}
        </fieldset>
      )}
      <div>
        <Label htmlFor="event-description">{generic ? "Description" : "Notes"}</Label>
        <Textarea
          id="event-description"
          value={generic ? description : notes}
          onChange={(e) =>
            generic ? setDescription(e.target.value) : setNotes(e.target.value)
          }
          rows={4}
          placeholder={generic ? "Optional details about this event" : "Optional notes"}
        />
      </div>
      {generic && participantOptions && participantOptions.length > 0 && (
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
              {user.name}
            </label>
          ))}
        </fieldset>
      )}
      {generic && (
        <ParticipationSettingsFields
          idPrefix="create-event"
          variant="event"
          value={participation}
          onChange={setParticipation}
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || !typeId}>
        {loading ? "Creating..." : "Create event"}
      </Button>
    </form>
  );
}

export function EditEventForm({
  event,
  eventTypes,
  choreographyOptions,
}: {
  event: SerializedEvent;
  eventTypes: SerializedEventType[];
  choreographyOptions?: ChoreographyOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeId, setTypeId] = useState(event.type.id);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [notes, setNotes] = useState(event.notes ?? "");
  const [locationSelection, setLocationSelection] = useState<LocationSelection>(() =>
    selectionFromRecord(event),
  );
  const [choreographyId, setChoreographyId] = useState(event.choreographyId ?? "");
  const [selectedChoreographyIds, setSelectedChoreographyIds] = useState(
    event.choreographies.map((item) => item.id),
  );
  const [participation, setParticipation] = useState<ParticipationSettings>({
    allowParticipantJoin: event.allowParticipantJoin,
    allowJoinRequests: event.allowJoinRequests,
    hideFromNonParticipants: event.hideFromNonParticipants,
  });
  const [start, setStart] = useState<DateTimeParts>(() =>
    dateToDateTimeParts(new Date(event.startsAt)),
  );
  const [end, setEnd] = useState<DateTimeParts>(() =>
    event.endsAt
      ? dateToDateTimeParts(new Date(event.endsAt))
      : addOneHour(dateToDateTimeParts(new Date(event.startsAt))),
  );

  const eventType = selectedEventType(eventTypes, typeId);
  const generic = isGenericEventKind(eventType?.kind ?? null);
  const allowsChoreographyLinks = eventKindAllowsChoreographyLinks(eventType?.kind ?? null);

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
        typeId,
        title: title || undefined,
        description: generic ? description || undefined : undefined,
        notes: generic ? undefined : notes || undefined,
        ...locationPayload(locationSelection),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
        choreographyId: eventType?.kind === "REPETITION" ? choreographyId || null : null,
        choreographyIds: allowsChoreographyLinks ? selectedChoreographyIds : undefined,
        ...(generic ? participation : {}),
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
          <Label htmlFor="edit-event-type">Type</Label>
          <Select
            id="edit-event-type"
            className="mt-1 block w-full"
            value={typeId}
            onChange={(formEvent) => setTypeId(formEvent.target.value)}
          >
            {eventTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="edit-event-title">Title</Label>
          <Input
            id="edit-event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required={generic}
          />
        </div>
        <EventScheduleFields
          start={start}
          end={end}
          onStartChange={handleStartChange}
          onEndChange={setEnd}
        />
        <LocationPicker
          id="edit-event-location"
          value={locationSelection}
          onChange={setLocationSelection}
        />
        {eventType?.kind === "REPETITION" && choreographyOptions && (
          <div>
            <Label htmlFor="edit-event-choreography">Choreography</Label>
            <Select
              id="edit-event-choreography"
              className="mt-1 block w-full"
              value={choreographyId}
              onChange={(formEvent) => setChoreographyId(formEvent.target.value)}
            >
              <option value="">None</option>
              {choreographyOptions.map((choreography) => (
                <option key={choreography.id} value={choreography.id}>
                  {choreography.title}
                </option>
              ))}
            </Select>
          </div>
        )}
        {allowsChoreographyLinks && choreographyOptions && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-stone-700">
              Linked choreographies
            </legend>
            {choreographyOptions.map((choreography) => (
              <label key={choreography.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedChoreographyIds.includes(choreography.id)}
                  onChange={(formEvent) => {
                    setSelectedChoreographyIds((current) =>
                      formEvent.target.checked
                        ? [...current, choreography.id]
                        : current.filter((id) => id !== choreography.id),
                    );
                  }}
                  className="rounded border-stone-300"
                />
                {choreography.title}
              </label>
            ))}
          </fieldset>
        )}
        <div>
          <Label htmlFor="edit-event-description">{generic ? "Description" : "Notes"}</Label>
          <Textarea
            id="edit-event-description"
            value={generic ? description : notes}
            onChange={(e) =>
              generic ? setDescription(e.target.value) : setNotes(e.target.value)
            }
            rows={4}
          />
        </div>
        {generic && (
          <ParticipationSettingsFields
            idPrefix="edit-event"
            variant="event"
            value={participation}
            onChange={setParticipation}
          />
        )}
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
              {user.name}
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

export type DemonstrationItem = {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
};

export function DemonstrationsSection({
  choreographyId,
  choreographyTitle,
  demonstrations,
  canEdit,
  eventTypes,
  participantOptions,
}: {
  choreographyId: string;
  choreographyTitle: string;
  demonstrations: DemonstrationItem[];
  canEdit: boolean;
  eventTypes: SerializedEventType[];
  participantOptions: UserOption[];
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const demonstrationType = eventTypes.find((type) => type.kind === "DEMONSTRATION");

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Demonstrations</h2>
        {canEdit && !showAddForm && demonstrationType && (
          <Button type="button" onClick={() => setShowAddForm(true)}>
            Add a demonstration
          </Button>
        )}
      </div>

      {canEdit && showAddForm && demonstrationType && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <CreateEventForm
            eventTypes={eventTypes}
            participantOptions={participantOptions}
            choreographyOptions={[{ id: choreographyId, title: choreographyTitle }]}
            defaultTypeId={demonstrationType.id}
            lockType
            defaultChoreographyId={choreographyId}
            lockChoreography
            onSuccess={() => setShowAddForm(false)}
            redirectBasePath="/events"
          />
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {demonstrations.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-stone-600">No demonstrations linked yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {demonstrations.map((demonstration) => (
            <div
              key={demonstration.id}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/events/${demonstration.id}`}
                    className="font-semibold hover:text-stone-700"
                  >
                    {demonstration.title || "Demonstration"}
                  </Link>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatDateTime(new Date(demonstration.startsAt))}
                    {demonstration.endsAt &&
                      ` – ${formatDateTime(new Date(demonstration.endsAt))}`}
                  </p>
                  {demonstration.location && (
                    <p className="mt-1 text-sm text-stone-500">{demonstration.location}</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <EditIconLink
                      href={`/events/${demonstration.id}`}
                      label="Edit demonstration"
                    />
                    <DeleteEventButton
                      deleteUrl={`/api/events/${demonstration.id}/choreographies`}
                      deleteBody={{ choreographyId }}
                      confirmMessage="Remove this demonstration from the choreography? The demonstration itself will not be deleted."
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
