"use client";

import { useEffect, useState } from "react";
import { Input, Label, Select } from "@/components/ui";
import type { LocationRecord } from "@/lib/locations";

export type LocationSelection = {
  kind: "none" | "listed" | "unique";
  locationId: string | null;
  location: string;
};

export const emptyLocationSelection: LocationSelection = {
  kind: "none",
  locationId: null,
  location: "",
};

export function locationPayload(selection: LocationSelection) {
  if (selection.kind === "listed" && selection.locationId) {
    return { locationId: selection.locationId, location: null };
  }

  if (selection.kind === "unique") {
    const unique = selection.location.trim();
    return { locationId: null, location: unique || null };
  }

  return { locationId: null, location: null };
}

export function selectionFromRecord(record: {
  locationId?: string | null;
  location: string | null;
}): LocationSelection {
  if (record.locationId) {
    return { kind: "listed", locationId: record.locationId, location: "" };
  }

  if (record.location) {
    return { kind: "unique", locationId: null, location: record.location };
  }

  return emptyLocationSelection;
}

const UNIQUE_VALUE = "__unique__";

export function LocationPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: LocationSelection;
  onChange: (value: LocationSelection) => void;
}) {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const selectValue =
    value.kind === "listed" && value.locationId
      ? value.locationId
      : value.kind === "unique"
        ? UNIQUE_VALUE
        : "";

  useEffect(() => {
    let cancelled = false;

    fetch("/api/locations")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!cancelled && Array.isArray(data.locations)) {
          setLocations(data.locations);
        }
      })
      .catch(() => {
        // Keep the picker usable with a unique location if the list cannot load.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectChange(nextValue: string) {
    if (nextValue === UNIQUE_VALUE) {
      onChange({ kind: "unique", locationId: null, location: value.location });
      return;
    }

    if (!nextValue) {
      onChange(emptyLocationSelection);
      return;
    }

    onChange({ kind: "listed", locationId: nextValue, location: "" });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={id}>Location</Label>
        <Select
          id={id}
          value={selectValue}
          onChange={(event) => handleSelectChange(event.target.value)}
          className="w-full"
        >
          <option value="">No location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
          {value.kind === "listed" &&
            value.locationId &&
            !locations.some((location) => location.id === value.locationId) && (
              <option value={value.locationId}>Current location</option>
            )}
          <option value={UNIQUE_VALUE}>Unique location…</option>
        </Select>
      </div>
      {value.kind === "unique" && (
        <div>
          <Label htmlFor={`${id}-unique`}>Unique location</Label>
          <Input
            id={`${id}-unique`}
            value={value.location}
            onChange={(event) =>
              onChange({ kind: "unique", locationId: null, location: event.target.value })
            }
            placeholder="Studio 2"
          />
        </div>
      )}
    </div>
  );
}
