"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DateTime24Input } from "@/components/DateTime24Input";
import { SchedulingCandidateCalendar } from "@/components/SchedulingCandidateCalendar";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import {
  combineDateAndTime,
  HOURS_24,
  todayDateInputValue,
  type DateTimeParts,
} from "@/lib/datetime";
import { parseDayKey } from "@/lib/scheduling/intervals";
import { nextWeekendDayKeys } from "@/lib/scheduling/weekend";
import type {
  LocationUnavailability,
  ScheduleCaveat,
  SchedulingCandidate,
  SchedulingItemDraft,
  SchedulingRequest,
} from "@/lib/scheduling/types";
import { cn } from "@/lib/utils";

export type SchedulingChoreographyOption = {
  id: string;
  title: string;
  groups: { id: string; name: string }[];
};

export type SchedulingLocationOption = {
  id: string;
  name: string;
};

const STEPS = [
  "Choreographies",
  "Days & locations",
  "Constraints",
  "Generate",
  "Choose a solution",
] as const;

const MINUTES_5 = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

function newItemId() {
  return crypto.randomUUID();
}

function defaultUnavailabilityTimes(day: string): { start: DateTimeParts; end: DateTimeParts } {
  return {
    start: { date: day, hour: "12", minute: "00" },
    end: { date: day, hour: "14", minute: "00" },
  };
}

function itemLabel(
  item: SchedulingItemDraft,
  choreographies: SchedulingChoreographyOption[],
) {
  const choreography = choreographies.find((entry) => entry.id === item.choreographyId);
  const group = choreography?.groups.find((entry) => entry.id === item.groupId);
  if (!choreography) {
    return "Choreography";
  }
  return group ? `${choreography.title} · ${group.name}` : choreography.title;
}

export function SchedulingTool({
  choreographies,
  locations,
}: {
  choreographies: SchedulingChoreographyOption[];
  locations: SchedulingLocationOption[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<SchedulingItemDraft[]>([]);
  const [selectedChoreographyId, setSelectedChoreographyId] = useState(choreographies[0]?.id ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [days, setDays] = useState<string[]>(() => [...nextWeekendDayKeys()]);
  const [dayToAdd, setDayToAdd] = useState(todayDateInputValue());
  const [locationIds, setLocationIds] = useState<string[]>(() => locations.map((location) => location.id));
  const [locationUnavailabilities, setLocationUnavailabilities] = useState<
    Array<LocationUnavailability & { id: string }>
  >([]);
  const [restMinutes, setRestMinutes] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [candidates, setCandidates] = useState<SchedulingCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const selectedChoreography = choreographies.find((entry) => entry.id === selectedChoreographyId);

  function addItem() {
    if (!selectedChoreographyId) {
      setError("Select a choreography.");
      return;
    }
    setError(null);
    setItems((current) => [
      ...current,
      {
        id: newItemId(),
        choreographyId: selectedChoreographyId,
        groupId: selectedGroupId || null,
        durationMinutes,
        allowedLocationIds: [],
        allowedWindows: [],
      },
    ]);
  }

  function updateItem(id: string, patch: Partial<SchedulingItemDraft>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function toggleLocation(locationId: string) {
    setLocationIds((current) =>
      current.includes(locationId)
        ? current.filter((id) => id !== locationId)
        : [...current, locationId],
    );
  }

  function buildRequest(): SchedulingRequest {
    return {
      items,
      days,
      locationIds,
      locationUnavailabilities: locationUnavailabilities
        .filter((entry) => locationIds.includes(entry.locationId) && days.includes(entry.day))
        .map((entry) => ({
          locationId: entry.locationId,
          day: entry.day,
          startsAt: entry.startsAt,
          endsAt: entry.endsAt,
        })),
      restMinutes,
    };
  }

  function validateThrough(targetStep: number): string | null {
    if (targetStep >= 1 && items.length === 0) {
      return "Add at least one choreography.";
    }
    if (targetStep >= 2 && days.length === 0) {
      return "Select at least one day.";
    }
    if (targetStep >= 2 && locationIds.length === 0) {
      return "Select at least one location.";
    }
    return null;
  }

  function goTo(nextStep: number) {
    const message = validateThrough(nextStep);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep(nextStep);
  }

  async function generate() {
    const message = validateThrough(3);
    if (message) {
      setError(message);
      return;
    }

    setGenerating(true);
    setError(null);
    setStep(3);

    const response = await fetch("/api/scheduling/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequest()),
    });
    const data = await response.json();
    setGenerating(false);

    if (!response.ok) {
      setError(data.error ?? "Could not generate a schedule.");
      return;
    }

    const nextCandidates = data.candidates as SchedulingCandidate[];
    setCandidates(nextCandidates);
    setSelectedCandidateId(nextCandidates[0]?.id ?? null);
    setStep(4);
  }

  async function applySelected() {
    const candidate = candidates.find((entry) => entry.id === selectedCandidateId);
    if (!candidate) {
      setError("Select a candidate first.");
      return;
    }

    setApplying(true);
    setError(null);

    const response = await fetch("/api/scheduling/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placements: candidate.placements.map((placement) => ({
          choreographyId: placement.choreographyId,
          groupId: placement.groupId,
          locationId: placement.locationId,
          startsAt: placement.startsAt,
          endsAt: placement.endsAt,
        })),
      }),
    });
    const data = await response.json();
    setApplying(false);

    if (!response.ok) {
      setError(data.error ?? "Could not create the rehearsals.");
      return;
    }

    router.push("/events");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => goTo(index)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                index === step
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200",
              )}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {step === 0 && (
        <Card className="space-y-4">
          <p className="text-sm text-stone-600">
            Choose choreographies or choreography groups. The same piece can be added more than once.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="scheduling-choreography">Choreography</Label>
              <Select
                id="scheduling-choreography"
                className="w-full"
                value={selectedChoreographyId}
                onChange={(event) => {
                  setSelectedChoreographyId(event.target.value);
                  setSelectedGroupId("");
                }}
              >
                {choreographies.length === 0 && <option value="">No choreographies</option>}
                {choreographies.map((choreography) => (
                  <option key={choreography.id} value={choreography.id}>
                    {choreography.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="scheduling-group">Group</Label>
              <Select
                id="scheduling-group"
                className="w-full"
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                disabled={!selectedChoreography}
              >
                <option value="">Whole choreography</option>
                {selectedChoreography?.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="scheduling-duration">Duration (minutes)</Label>
              <Input
                id="scheduling-duration"
                type="number"
                min={15}
                step={5}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value) || 60)}
              />
            </div>
          </div>
          <Button type="button" onClick={addItem} disabled={!selectedChoreographyId}>
            Add to list
          </Button>

          {items.length === 0 ? (
            <p className="text-sm text-stone-500">No rehearsals in the list yet.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {index + 1}. {itemLabel(item, choreographies)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Label className="mb-0 text-xs" htmlFor={`duration-${item.id}`}>
                      Minutes
                    </Label>
                    <Input
                      id={`duration-${item.id}`}
                      type="number"
                      min={15}
                      step={5}
                      className="w-24"
                      value={item.durationMinutes}
                      onChange={(event) =>
                        updateItem(item.id, { durationMinutes: Number(event.target.value) || 60 })
                      }
                    />
                    <Button type="button" variant="ghost" onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {step === 1 && (
        <Card className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-stone-800">Days</p>
            <p className="mb-3 text-sm text-stone-600">Defaults to the next weekend.</p>
            <div className="flex flex-wrap gap-2">
              {days.map((day) => (
                <span
                  key={day}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm"
                >
                  {format(parseDayKey(day), "EEEE d MMM")}
                  <button
                    type="button"
                    className="text-stone-500 hover:text-stone-800"
                    onClick={() => {
                      setDays(days.filter((entry) => entry !== day));
                      setLocationUnavailabilities((current) =>
                        current.filter((entry) => entry.day !== day),
                      );
                    }}
                    aria-label={`Remove ${day}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="add-day">Add a day</Label>
                <Input
                  id="add-day"
                  type="date"
                  value={dayToAdd}
                  onChange={(event) => setDayToAdd(event.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (dayToAdd && !days.includes(dayToAdd)) {
                    setDays([...days, dayToAdd].sort());
                  }
                }}
              >
                Add day
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-stone-800">Locations</p>
            {locations.length === 0 ? (
              <p className="text-sm text-stone-500">Add listed locations in Settings first.</p>
            ) : (
              <div className="space-y-2">
                {locations.map((location) => (
                  <label key={location.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={locationIds.includes(location.id)}
                      onChange={() => toggleLocation(location.id)}
                      className="rounded border-stone-300"
                    />
                    {location.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-stone-800">Location unavailability</p>
            <p className="mb-3 text-sm text-stone-600">
              Locations are available from 09:00 to 20:00 on the selected days. Add times when a
              location cannot be used.
            </p>
            <div className="space-y-4">
              {locationIds.map((locationId) => {
                const location = locations.find((entry) => entry.id === locationId);
                const entries = locationUnavailabilities.filter(
                  (entry) => entry.locationId === locationId && days.includes(entry.day),
                );
                return (
                  <LocationUnavailabilityCard
                    key={locationId}
                    name={location?.name ?? "Location"}
                    locationId={locationId}
                    days={days}
                    entries={entries}
                    onAdd={(entry) =>
                      setLocationUnavailabilities((current) => [...current, { ...entry, id: newItemId() }])
                    }
                    onRemove={(id) =>
                      setLocationUnavailabilities((current) => current.filter((entry) => entry.id !== id))
                    }
                  />
                );
              })}
            </div>
          </div>

          <div className="max-w-xs">
            <Label htmlFor="rest-minutes">Rest between choreographies (minutes)</Label>
            <Input
              id="rest-minutes"
              type="number"
              min={0}
              value={restMinutes}
              onChange={(event) => setRestMinutes(Number(event.target.value) || 0)}
            />
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Optionally limit each rehearsal to certain locations or datetime windows.
          </p>
          {items.map((item) => (
            <ConstraintCard
              key={item.id}
              item={item}
              label={itemLabel(item, choreographies)}
              locations={locations.filter((location) => locationIds.includes(location.id))}
              days={days}
              onChange={(patch) => updateItem(item.id, patch)}
            />
          ))}
        </div>
      )}

      {step === 3 && (
        <Card className="space-y-3">
          <p className="text-sm text-stone-600">
            The scheduler places rehearsals on available locations, allows overlap across locations, and
            searches with A* using availability, rest, and the listed scoring weights.
          </p>
          <Button type="button" onClick={generate} disabled={generating}>
            {generating ? "Generating…" : "Generate 3 candidates"}
          </Button>
        </Card>
      )}

      {step === 4 && (
        <div className="space-y-4">
          {candidates.map((candidate) => {
            const selected = candidate.id === selectedCandidateId;
            const unavailable = uniquePeople(
              candidate.caveats.filter((caveat) => caveat.kind === "participant_unavailable"),
            );
            return (
              <Card
                key={candidate.id}
                className={cn("space-y-4", selected && "border-stone-900 ring-2 ring-stone-900")}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Candidate {candidate.id}</h2>
                    <p className="text-sm text-stone-500">Score {candidate.score}</p>
                  </div>
                  <Button
                    type="button"
                    variant={selected ? "primary" : "secondary"}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                  >
                    {selected ? "Selected" : "Select"}
                  </Button>
                </div>
                <SchedulingCandidateCalendar placements={candidate.placements} />
                <div>
                  <p className="mb-1 text-sm font-medium">Participants not available</p>
                  {unavailable.length === 0 ? (
                    <p className="text-sm text-stone-500">None for this candidate.</p>
                  ) : (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
                      {unavailable.map((caveat) => (
                        <li key={`${caveat.userId}-${caveat.message}`}>{caveat.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
          <Button type="button" onClick={applySelected} disabled={applying || !selectedCandidateId}>
            {applying ? "Creating rehearsals…" : "Create rehearsals"}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {step > 0 && (
          <Button type="button" variant="secondary" onClick={() => goTo(step - 1)} disabled={generating || applying}>
            Back
          </Button>
        )}
        {step < 3 && (
          <Button type="button" onClick={() => goTo(step + 1)}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

function uniquePeople(caveats: ScheduleCaveat[]) {
  const seen = new Set<string>();
  return caveats.filter((caveat) => {
    const key = caveat.userId ?? caveat.message;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function LocationUnavailabilityCard({
  name,
  locationId,
  days,
  entries,
  onAdd,
  onRemove,
}: {
  name: string;
  locationId: string;
  days: string[];
  entries: Array<LocationUnavailability & { id: string }>;
  onAdd: (entry: LocationUnavailability) => void;
  onRemove: (id: string) => void;
}) {
  const [day, setDay] = useState(days[0] ?? "");
  const [times, setTimes] = useState(() => defaultUnavailabilityTimes(days[0] ?? todayDateInputValue()));

  function addEntry() {
    const selectedDay = day || days[0];
    if (!selectedDay) {
      return;
    }
    const start = combineDateAndTime(selectedDay, times.start.hour, times.start.minute);
    const end = combineDateAndTime(selectedDay, times.end.hour, times.end.minute);
    if (end <= start) {
      return;
    }
    onAdd({
      locationId,
      day: selectedDay,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });
  }

  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <p className="mb-2 text-sm font-semibold">{name}</p>
      {entries.length === 0 ? (
        <p className="mb-3 text-sm text-stone-500">No unavailability added.</p>
      ) : (
        <ul className="mb-3 space-y-1 text-sm text-stone-700">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-2">
              <span>
                {format(parseDayKey(entry.day), "EEE d MMM")}{" "}
                {format(new Date(entry.startsAt), "HH:mm")}→{format(new Date(entry.endsAt), "HH:mm")}
              </span>
              <Button type="button" variant="ghost" onClick={() => onRemove(entry.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {days.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor={`unavail-day-${locationId}`}>Day</Label>
            <Select
              id={`unavail-day-${locationId}`}
              className="w-full"
              value={days.includes(day) ? day : days[0]}
              onChange={(event) => setDay(event.target.value)}
            >
              {days.map((entry) => (
                <option key={entry} value={entry}>
                  {format(parseDayKey(entry), "EEE d MMM")}
                </option>
              ))}
            </Select>
          </div>
          <TimeSelect
            label="Unavailable from"
            value={times.start}
            onChange={(start) => setTimes((current) => ({ ...current, start }))}
          />
          <TimeSelect
            label="Unavailable until"
            value={times.end}
            onChange={(end) => setTimes((current) => ({ ...current, end }))}
          />
          <Button type="button" variant="secondary" onClick={addEntry}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function TimeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateTimeParts;
  onChange: (value: DateTimeParts) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Select
          value={value.hour}
          onChange={(event) => onChange({ ...value, hour: event.target.value })}
          className="min-h-11 w-20"
          aria-label={`${label} hour`}
        >
          {HOURS_24.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </Select>
        <span className="text-stone-500">:</span>
        <Select
          value={value.minute}
          onChange={(event) => onChange({ ...value, minute: event.target.value })}
          className="min-h-11 w-20"
          aria-label={`${label} minute`}
        >
          {MINUTES_5.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function ConstraintCard({
  item,
  label,
  locations,
  days,
  onChange,
}: {
  item: SchedulingItemDraft;
  label: string;
  locations: SchedulingLocationOption[];
  days: string[];
  onChange: (patch: Partial<SchedulingItemDraft>) => void;
}) {
  const [windowStart, setWindowStart] = useState<DateTimeParts>(() => ({
    date: days[0] ?? todayDateInputValue(),
    hour: "09",
    minute: "00",
  }));
  const [windowEnd, setWindowEnd] = useState<DateTimeParts>(() => ({
    date: days[0] ?? todayDateInputValue(),
    hour: "18",
    minute: "00",
  }));

  function toggleLocation(locationId: string) {
    const current = item.allowedLocationIds;
    onChange({
      allowedLocationIds: current.includes(locationId)
        ? current.filter((id) => id !== locationId)
        : [...current, locationId],
    });
  }

  function addWindow() {
    const start = combineDateAndTime(windowStart.date, windowStart.hour, windowStart.minute);
    const end = combineDateAndTime(windowEnd.date, windowEnd.hour, windowEnd.minute);
    if (end <= start) {
      return;
    }
    onChange({
      allowedWindows: [
        ...item.allowedWindows,
        { startsAt: start.toISOString(), endsAt: end.toISOString() },
      ],
    });
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">{label}</h2>
      <div>
        <p className="mb-2 text-sm font-medium">Limit to locations</p>
        <p className="mb-2 text-xs text-stone-500">Leave all unchecked to allow every selected location.</p>
        <div className="flex flex-wrap gap-3">
          {locations.map((location) => (
            <label key={location.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.allowedLocationIds.includes(location.id)}
                onChange={() => toggleLocation(location.id)}
                className="rounded border-stone-300"
              />
              {location.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Limit to datetime windows</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <DateTime24Input name={`${item.id}-from`} label="From" value={windowStart} onChange={setWindowStart} />
          <DateTime24Input name={`${item.id}-to`} label="To" value={windowEnd} onChange={setWindowEnd} />
        </div>
        <Button type="button" variant="secondary" className="mt-3" onClick={addWindow}>
          Add window
        </Button>
        {item.allowedWindows.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-stone-700">
            {item.allowedWindows.map((window, index) => (
              <li key={`${window.startsAt}-${window.endsAt}`} className="flex items-center justify-between gap-2">
                <span>
                  {format(new Date(window.startsAt), "EEE d MMM HH:mm")} → {format(new Date(window.endsAt), "HH:mm")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      allowedWindows: item.allowedWindows.filter((_, windowIndex) => windowIndex !== index),
                    })
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
