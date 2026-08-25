"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime24Input } from "@/components/DateTime24Input";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import {
  RepetitionEventCard,
  type RepetitionListItem,
} from "@/components/RepetitionEventCard";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { matchesSearch } from "@/lib/search";
import {
  addOneHour,
  dateTimePartsToDate,
  dateToDateTimeParts,
  defaultStartDateTime,
  type DateTimeParts,
} from "@/lib/datetime";

export type RepetitionDetailItem = {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  notes: string | null;
};

type UserOption = { id: string; name: string; email: string };

export function AssignMemberForm({
  choreographyId,
  users,
  assignedUserIds,
}: {
  choreographyId: string;
  users: UserOption[];
  assignedUserIds: string[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableUsers = users.filter((user) => !assignedUserIds.includes(user.id));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/choreographies/${choreographyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to assign member.");
      return;
    }

    setUserId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="member">Assign participant</Label>
        <select
          id="member"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
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
        {loading ? "Assigning..." : "Assign participant"}
      </Button>
    </form>
  );
}

export function AssignChoreographerForm({
  choreographyId,
  users,
  assignedUserIds,
}: {
  choreographyId: string;
  users: UserOption[];
  assignedUserIds: string[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableUsers = users.filter((user) => !assignedUserIds.includes(user.id));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError(null);

    const response = await fetch(
      `/api/choreographies/${choreographyId}/choreographers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      },
    );

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to assign choreographer.");
      return;
    }

    setUserId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="choreographer">Add choreographer</Label>
        <select
          id="choreographer"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
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
      <Button type="submit" disabled={loading || !userId} variant="secondary">
        {loading ? "Adding..." : "Add choreographer"}
      </Button>
    </form>
  );
}

export function CreateRepetitionForm({
  choreographyId,
  onSuccess,
  onCancel,
}: {
  choreographyId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState<DateTimeParts>(defaultStartDateTime);
  const [end, setEnd] = useState<DateTimeParts>(() => addOneHour(defaultStartDateTime()));

  function handleStartChange(nextStart: DateTimeParts) {
    setStart(nextStart);
    setEnd(addOneHour(nextStart));
  }

  function resetScheduleFields() {
    const initialStart = defaultStartDateTime();
    setStart(initialStart);
    setEnd(addOneHour(initialStart));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setError(null);

    const formData = new FormData(form);
    const startsAt = dateTimePartsToDate(start);
    const endsAt = dateTimePartsToDate(end);

    if (!startsAt) {
      setError("Start date and time are required.");
      setLoading(false);
      return;
    }

    if (endsAt && endsAt <= startsAt) {
      setError("End time must be after start time.");
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/choreographies/${choreographyId}/repetitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title") || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
        location: formData.get("location") || undefined,
        notes: formData.get("notes") || undefined,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to create repetition.");
      return;
    }

    form.reset();
    resetScheduleFields();
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Rehearsal" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTime24Input
          name="startsAt"
          label="Start"
          required
          value={start}
          onChange={handleStartChange}
        />
        <DateTime24Input
          name="endsAt"
          label="End"
          required
          value={end}
          onChange={setEnd}
        />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="Studio A" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Scheduling..." : "Schedule repetition"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function EditRepetitionForm({ repetition }: { repetition: RepetitionDetailItem }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(repetition.title ?? "");
  const [location, setLocation] = useState(repetition.location ?? "");
  const [notes, setNotes] = useState(repetition.notes ?? "");
  const [start, setStart] = useState<DateTimeParts>(() =>
    dateToDateTimeParts(new Date(repetition.startsAt)),
  );
  const [end, setEnd] = useState<DateTimeParts>(() =>
    repetition.endsAt
      ? dateToDateTimeParts(new Date(repetition.endsAt))
      : addOneHour(dateToDateTimeParts(new Date(repetition.startsAt))),
  );

  function handleStartChange(nextStart: DateTimeParts) {
    setStart(nextStart);
    setEnd(addOneHour(nextStart));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const startsAt = dateTimePartsToDate(start);
    const endsAt = dateTimePartsToDate(end);

    if (!startsAt) {
      setError("Start date and time are required.");
      setLoading(false);
      return;
    }

    if (endsAt && endsAt <= startsAt) {
      setError("End time must be after start time.");
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/repetitions/${repetition.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
        location: location || undefined,
        notes: notes || undefined,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to update repetition.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="edit-repetition-title">Title</Label>
        <Input
          id="edit-repetition-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Rehearsal"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTime24Input
          name="startsAt"
          label="Start"
          required
          value={start}
          onChange={handleStartChange}
        />
        <DateTime24Input
          name="endsAt"
          label="End"
          required
          value={end}
          onChange={setEnd}
        />
      </div>
      <div>
        <Label htmlFor="edit-repetition-location">Location</Label>
        <Input
          id="edit-repetition-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Studio A"
        />
      </div>
      <div>
        <Label htmlFor="edit-repetition-notes">Notes</Label>
        <Textarea
          id="edit-repetition-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

export function RepetitionsSection({
  choreographyId,
  canEdit,
  repetitions,
}: {
  choreographyId: string;
  canEdit: boolean;
  repetitions: RepetitionListItem[];
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");

  const filteredRepetitions = useMemo(() => {
    return repetitions.filter((repetition) =>
      matchesSearch(
        search,
        repetition.title,
        repetition.location,
        ...repetition.availableNames,
        ...repetition.unavailableNames,
      ),
    );
  }, [repetitions, search]);

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Repetitions</h2>
        {canEdit && !showAddForm && (
          <Button type="button" onClick={() => setShowAddForm(true)}>
            Schedule a repetition
          </Button>
        )}
      </div>

      {repetitions.length > 0 && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <Label htmlFor="repetition-search">Search</Label>
          <Input
            id="repetition-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, location, or participant…"
            autoComplete="off"
            className="mt-1"
          />
          <p className="mt-2 text-sm text-stone-500">
            {filteredRepetitions.length} of {repetitions.length} repetitions
          </p>
        </div>
      )}

      {canEdit && showAddForm && (
        <Card className="mb-6">
          <h3 className="mb-4 font-medium">Schedule a repetition</h3>
          <CreateRepetitionForm
            choreographyId={choreographyId}
            onSuccess={() => setShowAddForm(false)}
            onCancel={() => setShowAddForm(false)}
          />
        </Card>
      )}

      {repetitions.length === 0 ? (
        <Card>
          <p className="text-stone-600">No repetitions scheduled yet.</p>
        </Card>
      ) : filteredRepetitions.length === 0 ? (
        <Card>
          <p className="text-stone-600">No repetitions match your search.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRepetitions.map((repetition) => (
            <RepetitionEventCard
              key={repetition.id}
              canEdit={canEdit}
              repetition={repetition}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function ParticipantsList({
  choreographyId,
  members,
  canEdit,
}: {
  choreographyId: string;
  members: UserOption[];
  canEdit: boolean;
}) {
  if (members.length === 0) {
    return <p className="mb-4 text-sm text-stone-600">No participants assigned yet.</p>;
  }

  return (
    <ul className="mb-4 space-y-2 text-sm">
      {members.map((member) => (
        <li key={member.id} className="flex items-center justify-between gap-2">
          <span>
            {member.name} <span className="text-stone-500">({member.email})</span>
          </span>
          {canEdit && (
            <DeleteEventButton
              deleteUrl={`/api/choreographies/${choreographyId}/members`}
              deleteBody={{ userId: member.id }}
              confirmMessage={`Remove ${member.name} from this choreography?`}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export function ChoreographersList({
  choreographyId,
  choreographers,
  canEdit,
}: {
  choreographyId: string;
  choreographers: UserOption[];
  canEdit: boolean;
}) {
  const canRemove = canEdit && choreographers.length > 1;

  return (
    <ul className="mb-4 space-y-2 text-sm">
      {choreographers.map((choreographer) => (
        <li key={choreographer.id} className="flex items-center justify-between gap-2">
          <span>
            {choreographer.name}{" "}
            <span className="text-stone-500">({choreographer.email})</span>
          </span>
          {canRemove && (
            <DeleteEventButton
              deleteUrl={`/api/choreographies/${choreographyId}/choreographers`}
              deleteBody={{ userId: choreographer.id }}
              confirmMessage={`Remove ${choreographer.name} as choreographer?`}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
