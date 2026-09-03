"use client";

import { useTranslations } from "next-intl";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime24Input } from "@/components/DateTime24Input";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import {
  RehearsalEventCard,
  type RehearsalListItem,
} from "@/components/RehearsalEventCard";
import {
  LocationPicker,
  locationPayload,
  selectionFromRecord,
} from "@/components/LocationPicker";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { type GroupOption } from "@/components/GroupForms";
import { CreateEventForm } from "@/components/EventForms";
import { matchesSearch } from "@/lib/search";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import {
  addOneHour,
  dateTimePartsToDate,
  dateToDateTimeParts,
  type DateTimeParts,
} from "@/lib/datetime";

export type RehearsalDetailItem = {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  locationId: string | null;
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
  const t = useTranslations("Components");
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
      setError(data.error ?? t("assignMemberError"));
      return;
    }

    setUserId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="member">{t("assignParticipant")}</Label>
        <select
          id="member"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base sm:text-sm"
        >
          <option value="">{t("selectUser")}</option>
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || !userId}>
        {loading ? t("assigning") : t("assignParticipant")}
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
  const t = useTranslations("Components");
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
      setError(data.error ?? t("assignChoreographerError"));
      return;
    }

    setUserId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="choreographer">{t("addChoreographer")}</Label>
        <select
          id="choreographer"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base sm:text-sm"
        >
          <option value="">{t("selectUser")}</option>
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || !userId} variant="secondary">
        {loading ? t("adding") : t("addChoreographer")}
      </Button>
    </form>
  );
}

export function CreateRehearsalForm({
  choreographyId,
  groups = [],
  eventTypes,
  onSuccess,
  onCancel,
}: {
  choreographyId: string;
  groups?: GroupOption[];
  eventTypes: SerializedEventType[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("Components");
  const rehearsalType = eventTypes.find((type) => type.kind === "REHEARSAL");

  if (!rehearsalType) {
    return <p className="text-sm text-stone-600">{t("rehearsalTypeMissing")}</p>;
  }

  return (
    <div className="space-y-3">
      <CreateEventForm
        eventTypes={eventTypes}
        defaultTypeId={rehearsalType.id}
        lockType
        defaultChoreographyId={choreographyId}
        lockChoreography
        groups={groups}
        choreographyOptions={[{ id: choreographyId, title: t("thisChoreography") }]}
        onSuccess={() => onSuccess?.()}
      />
      {onCancel && (
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
      )}
    </div>
  );
}

export function EditRehearsalForm({ rehearsal }: { rehearsal: RehearsalDetailItem }) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(rehearsal.title ?? "");
  const [locationSelection, setLocationSelection] = useState(() =>
    selectionFromRecord(rehearsal),
  );
  const [notes, setNotes] = useState(rehearsal.notes ?? "");
  const [start, setStart] = useState<DateTimeParts>(() =>
    dateToDateTimeParts(new Date(rehearsal.startsAt)),
  );
  const [end, setEnd] = useState<DateTimeParts>(() =>
    rehearsal.endsAt
      ? dateToDateTimeParts(new Date(rehearsal.endsAt))
      : addOneHour(dateToDateTimeParts(new Date(rehearsal.startsAt))),
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
      setError(t("startRequired"));
      setLoading(false);
      return;
    }

    if (endsAt && endsAt <= startsAt) {
      setError(t("endAfterStart"));
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/rehearsals/${rehearsal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
        ...locationPayload(locationSelection),
        notes: notes || undefined,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("rehearsalUpdateError"));
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="edit-rehearsal-title">{t("title")}</Label>
        <Input
          id="edit-rehearsal-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("rehearsal")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTime24Input
          name="startsAt"
          label={t("start")}
          required
          value={start}
          onChange={handleStartChange}
        />
        <DateTime24Input
          name="endsAt"
          label={t("end")}
          required
          value={end}
          onChange={setEnd}
        />
      </div>
      <LocationPicker
        id="edit-rehearsal-location"
        value={locationSelection}
        onChange={setLocationSelection}
      />
      <div>
        <Label htmlFor="edit-rehearsal-notes">{t("notes")}</Label>
        <Textarea
          id="edit-rehearsal-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}

export function RehearsalsSection({
  choreographyId,
  canEdit,
  groups = [],
  rehearsals,
  eventTypes,
}: {
  choreographyId: string;
  canEdit: boolean;
  groups?: GroupOption[];
  rehearsals: RehearsalListItem[];
  eventTypes: SerializedEventType[];
}) {
  const t = useTranslations("Components");
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");

  const filteredRehearsals = useMemo(() => {
    return rehearsals.filter((rehearsal) =>
      matchesSearch(
        search,
        rehearsal.title,
        rehearsal.location,
        rehearsal.groupName,
        ...rehearsal.availableNames,
        ...rehearsal.unavailableNames,
      ),
    );
  }, [rehearsals, search]);

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t("rehearsals")}</h2>
        {canEdit && !showAddForm && (
          <Button type="button" onClick={() => setShowAddForm(true)}>
            {t("scheduleRehearsal")}
          </Button>
        )}
      </div>

      {rehearsals.length > 0 && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <Label htmlFor="rehearsal-search">{t("search")}</Label>
          <Input
            id="rehearsal-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("rehearsalSearchPlaceholder")}
            autoComplete="off"
            className="mt-1"
          />
          <p className="mt-2 text-sm text-stone-500">
            {filteredRehearsals.length} of {rehearsals.length} rehearsals
          </p>
        </div>
      )}

      {canEdit && showAddForm && (
        <Card className="mb-6">
          <h3 className="mb-4 font-medium">{t("scheduleRehearsal")}</h3>
          <CreateRehearsalForm
            choreographyId={choreographyId}
            groups={groups}
            eventTypes={eventTypes}
            onSuccess={() => setShowAddForm(false)}
            onCancel={() => setShowAddForm(false)}
          />
        </Card>
      )}

      {rehearsals.length === 0 ? (
        <Card>
          <p className="text-stone-600">{t("noRehearsals")}</p>
        </Card>
      ) : filteredRehearsals.length === 0 ? (
        <Card>
          <p className="text-stone-600">{t("noMatchingRehearsals")}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRehearsals.map((rehearsal) => (
            <RehearsalEventCard
              key={rehearsal.id}
              canEdit={canEdit}
              rehearsal={rehearsal}
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
  const t = useTranslations("Components");
  if (members.length === 0) {
    return <p className="mb-4 text-sm text-stone-600">{t("noAssignedParticipants")}</p>;
  }

  return (
    <ul className="mb-4 space-y-2 text-sm">
      {members.map((member) => (
        <li key={member.id} className="flex items-center justify-between gap-2">
          <span>{member.name}</span>
          {canEdit && (
            <DeleteEventButton
              deleteUrl={`/api/choreographies/${choreographyId}/members`}
              deleteBody={{ userId: member.id }}
              confirmMessage={t("removeMemberConfirm", {name: member.name})}
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
  const t = useTranslations("Components");
  const canRemove = canEdit && choreographers.length > 1;

  return (
    <ul className="mb-4 space-y-2 text-sm">
      {choreographers.map((choreographer) => (
        <li key={choreographer.id} className="flex items-center justify-between gap-2">
          <span>{choreographer.name}</span>
          {canRemove && (
            <DeleteEventButton
              deleteUrl={`/api/choreographies/${choreographyId}/choreographers`}
              deleteBody={{ userId: choreographer.id }}
              confirmMessage={t("removeChoreographerConfirm", {
                name: choreographer.name,
              })}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
