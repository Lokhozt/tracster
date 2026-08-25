"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime24Input } from "@/components/DateTime24Input";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { EditIconLink } from "@/components/EditIconLink";
import { Button, Input, Label, Textarea } from "@/components/ui";
import {
  addOneHour,
  dateTimePartsToDate,
  dateToDateTimeParts,
  defaultStartDateTime,
  formatDateTime,
  type DateTimeParts,
} from "@/lib/datetime";

export type RepresentationItem = {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  notes: string | null;
};

type LinkableRepresentation = {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
};

function RepresentationFields({
  title,
  location,
  notes,
  start,
  end,
  onStartChange,
  onEndChange,
  onTitleChange,
  onLocationChange,
  onNotesChange,
  titleId,
  locationId,
  notesId,
  showNotes = false,
}: {
  title: string;
  location: string;
  notes: string;
  start: DateTimeParts;
  end: DateTimeParts;
  onStartChange: (value: DateTimeParts) => void;
  onEndChange: (value: DateTimeParts) => void;
  onTitleChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onNotesChange?: (value: string) => void;
  titleId: string;
  locationId: string;
  notesId?: string;
  showNotes?: boolean;
}) {
  return (
    <>
      <div>
        <Label htmlFor={titleId}>Title</Label>
        <Input
          id={titleId}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Opening night"
        />
      </div>
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
      <div>
        <Label htmlFor={locationId}>Location</Label>
        <Input
          id={locationId}
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="Main stage"
        />
      </div>
      {showNotes && notesId && onNotesChange && (
        <div>
          <Label htmlFor={notesId}>Notes</Label>
          <Textarea
            id={notesId}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={3}
            placeholder="Optional notes"
          />
        </div>
      )}
    </>
  );
}

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

function buildRepresentationPayload(
  title: string,
  location: string,
  notes: string,
  start: DateTimeParts,
  end: DateTimeParts,
  includeNotes = false,
) {
  const startsAt = dateTimePartsToDate(start)!;
  const endsAt = dateTimePartsToDate(end);

  return {
    title: title || undefined,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt?.toISOString(),
    location: location || undefined,
    ...(includeNotes ? { notes: notes || undefined } : {}),
  };
}

export function CreateRepresentationForm({
  choreographyIds,
  choreographyOptions,
  onSuccess,
  submitLabel = "Create representation",
  redirectBasePath,
}: {
  choreographyIds?: string[];
  choreographyOptions?: { id: string; title: string }[];
  onSuccess?: (representationId: string) => void;
  submitLabel?: string;
  redirectBasePath?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedChoreographyIds, setSelectedChoreographyIds] = useState<string[]>(
    choreographyIds ?? [],
  );
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

    const response = await fetch("/api/representations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildRepresentationPayload(title, location, notes, start, end, true),
        choreographyIds:
          selectedChoreographyIds.length > 0 ? selectedChoreographyIds : choreographyIds,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to create representation.");
      return;
    }

    const representationId = data.representation.id as string;
    if (redirectBasePath) {
      router.push(`${redirectBasePath}/${representationId}`);
    } else {
      router.refresh();
    }
    onSuccess?.(representationId);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <RepresentationFields
        title={title}
        location={location}
        notes={notes}
        start={start}
        end={end}
        onStartChange={handleStartChange}
        onEndChange={setEnd}
        onTitleChange={setTitle}
        onLocationChange={setLocation}
        onNotesChange={setNotes}
        titleId="representation-title"
        locationId="representation-location"
        notesId="representation-notes"
        showNotes
      />
      {choreographyOptions && choreographyOptions.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-stone-700">
            Link to choreographies (optional)
          </legend>
          {choreographyOptions.map((choreography) => (
            <label key={choreography.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedChoreographyIds.includes(choreography.id)}
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : submitLabel}
      </Button>
    </form>
  );
}

export function EditRepresentationForm({
  representation,
  onCancel,
}: {
  representation: RepresentationItem;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(representation.title ?? "");
  const [location, setLocation] = useState(representation.location ?? "");
  const [notes, setNotes] = useState(representation.notes ?? "");
  const [start, setStart] = useState<DateTimeParts>(() =>
    dateToDateTimeParts(new Date(representation.startsAt)),
  );
  const [end, setEnd] = useState<DateTimeParts>(() =>
    representation.endsAt
      ? dateToDateTimeParts(new Date(representation.endsAt))
      : addOneHour(dateToDateTimeParts(new Date(representation.startsAt))),
  );

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

    const response = await fetch(`/api/representations/${representation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildRepresentationPayload(title, location, notes, start, end, true),
      ),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to update representation.");
      return;
    }

    onCancel?.();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <RepresentationFields
          title={title}
          location={location}
          notes={notes}
          start={start}
          end={end}
          onStartChange={handleStartChange}
          onEndChange={setEnd}
          onTitleChange={setTitle}
          onLocationChange={setLocation}
          onNotesChange={setNotes}
          titleId={`edit-title-${representation.id}`}
          locationId={`edit-location-${representation.id}`}
          notesId={`edit-notes-${representation.id}`}
          showNotes
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="border-t border-stone-100 pt-4">
        <p className="mb-2 text-sm font-medium text-stone-700">Danger zone</p>
        <DeleteEventButton
          deleteUrl={`/api/representations/${representation.id}`}
          confirmMessage="Delete this representation? It will be removed from all choreographies."
          redirectTo="/representations"
          className="inline-block"
        />
      </div>
    </div>
  );
}

function CreateRepresentationForChoreographyForm({
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
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
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

    const response = await fetch(`/api/choreographies/${choreographyId}/representations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "create",
        ...buildRepresentationPayload(title, location, "", start, end),
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to add representation.");
      return;
    }

    setTitle("");
    setLocation("");
    const initialStart = defaultStartDateTime();
    setStart(initialStart);
    setEnd(addOneHour(initialStart));
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <RepresentationFields
        title={title}
        location={location}
        notes=""
        start={start}
        end={end}
        onStartChange={handleStartChange}
        onEndChange={setEnd}
        onTitleChange={setTitle}
        onLocationChange={setLocation}
        titleId="choreography-representation-title"
        locationId="choreography-representation-location"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Create and link"}
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

function LinkRepresentationForm({
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
  const [options, setOptions] = useState<LinkableRepresentation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [representationId, setRepresentationId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setFetching(true);
      const response = await fetch(`/api/choreographies/${choreographyId}/representations`);
      const data = await response.json();
      if (!cancelled) {
        if (response.ok) {
          setOptions(data.representations ?? []);
          setRepresentationId(data.representations?.[0]?.id ?? "");
        } else {
          setError(data.error ?? "Unable to load representations.");
        }
        setFetching(false);
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [choreographyId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!representationId) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/choreographies/${choreographyId}/representations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "link",
        representationId,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to link representation.");
      return;
    }

    router.refresh();
    onSuccess?.();
  }

  if (fetching) {
    return <p className="text-sm text-stone-600">Loading representations...</p>;
  }

  if (options.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-stone-600">
          No other representations available to link. Create a new one instead.
        </p>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="link-representation">Representation</Label>
        <select
          id="link-representation"
          value={representationId}
          onChange={(event) => setRepresentationId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title ?? "Representation"} · {formatDateTime(new Date(option.startsAt))}
              {option.location ? ` · ${option.location}` : ""}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || !representationId}>
          {loading ? "Linking..." : "Link representation"}
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

function RepresentationCard({
  representation,
  choreographyId,
  canEdit,
}: {
  representation: RepresentationItem;
  choreographyId: string;
  canEdit: boolean;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/representations/${representation.id}`}
            className="font-semibold hover:text-stone-700"
          >
            {representation.title ?? "Representation"}
          </Link>
          <p className="mt-1 text-sm text-stone-600">
            {formatDateTime(new Date(representation.startsAt))}
            {representation.endsAt &&
              ` – ${formatDateTime(new Date(representation.endsAt))}`}
          </p>
          {representation.location && (
            <p className="mt-1 text-sm text-stone-500">{representation.location}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <EditIconLink
              href={`/representations/${representation.id}`}
              label="Edit representation"
            />
            <DeleteEventButton
              deleteUrl={`/api/choreographies/${choreographyId}/representations`}
              deleteBody={{ representationId: representation.id }}
              confirmMessage="Remove this representation from the choreography? The representation itself will not be deleted."
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function RepresentationsSection({
  choreographyId,
  representations,
  canEdit,
}: {
  choreographyId: string;
  representations: RepresentationItem[];
  canEdit: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"create" | "link">("create");

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Representations</h2>
        {canEdit && !showAddForm && (
          <Button type="button" onClick={() => setShowAddForm(true)}>
            Add a representation
          </Button>
        )}
      </div>

      {canEdit && showAddForm && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={addMode === "create" ? "primary" : "secondary"}
              onClick={() => setAddMode("create")}
            >
              Create new
            </Button>
            <Button
              type="button"
              variant={addMode === "link" ? "primary" : "secondary"}
              onClick={() => setAddMode("link")}
            >
              Link existing
            </Button>
          </div>

          {addMode === "create" ? (
            <CreateRepresentationForChoreographyForm
              choreographyId={choreographyId}
              onSuccess={() => setShowAddForm(false)}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <LinkRepresentationForm
              choreographyId={choreographyId}
              onSuccess={() => setShowAddForm(false)}
              onCancel={() => setShowAddForm(false)}
            />
          )}
        </div>
      )}

      {representations.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-stone-600">No representations linked yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {representations.map((representation) => (
            <RepresentationCard
              key={representation.id}
              representation={representation}
              choreographyId={choreographyId}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </section>
  );
}
