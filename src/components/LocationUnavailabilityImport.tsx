"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import {
  applyRoomMappings,
  defaultRoomMappings,
  IGNORE_IMPORTED_ROOM,
  parseLocationUnavailabilityImport,
  type ParsedLocationUnavailabilityImport,
} from "@/lib/scheduling/location-unavailability-import";
import type { LocationUnavailability } from "@/lib/scheduling/types";

export function LocationUnavailabilityImport({
  locations,
  onApply,
}: {
  locations: Array<{ id: string; name: string }>;
  onApply: (result: {
    days: string[];
    locationIds: string[];
    unavailabilities: LocationUnavailability[];
  }) => void;
}) {
  const t = useTranslations("Components");
  const [jsonText, setJsonText] = useState("");
  const [parsed, setParsed] = useState<ParsedLocationUnavailabilityImport | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function loadJson(text: string) {
    setMessage(null);
    const result = parseLocationUnavailabilityImport(text);
    if (!result.ok) {
      setParsed(null);
      setMapping({});
      setError(
        result.reason === "invalid_json"
          ? t("locationUnavailabilityImportInvalidJson")
          : t("locationUnavailabilityImportInvalidFormat"),
      );
      return;
    }

    setError(null);
    setParsed(result.data);
    setMapping(defaultRoomMappings(result.data.rooms, locations));
  }

  function apply() {
    if (!parsed) {
      setError(t("locationUnavailabilityImportMissing"));
      return;
    }

    const result = applyRoomMappings(parsed, mapping);
    if (!result.ok) {
      setError(
        result.reason === "unmapped_room"
          ? t("locationUnavailabilityImportUnmapped")
          : t("locationUnavailabilityImportInvalidFormat"),
      );
      return;
    }

    onApply(result);
    setError(null);
    setMessage(t("locationUnavailabilityImported"));
  }

  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <p className="mb-1 text-sm font-medium text-stone-800">{t("importLocationUnavailability")}</p>
      <p className="mb-3 text-sm text-stone-600">{t("importLocationUnavailabilityHelp")}</p>
      <div>
        <Label htmlFor="location-unavailability-file">{t("importLocationUnavailabilityFile")}</Label>
        <Input
          id="location-unavailability-file"
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            const text = await file.text();
            setJsonText(text);
            loadJson(text);
          }}
        />
      </div>
      <div className="mt-3">
        <Label htmlFor="location-unavailability-json">{t("importLocationUnavailabilityPaste")}</Label>
        <Textarea
          id="location-unavailability-json"
          rows={6}
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          placeholder='{"format_version":"3.0","locations":[...]}'
        />
        <Button
          type="button"
          variant="secondary"
          className="mt-2"
          onClick={() => loadJson(jsonText)}
          disabled={!jsonText.trim()}
        >
          {t("loadJson")}
        </Button>
      </div>

      {parsed && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-stone-800">{t("mapImportedRooms")}</p>
          <p className="text-sm text-stone-600">{t("mapImportedRoomsHelp")}</p>
          <div className="space-y-2">
            {parsed.rooms.map((room) => (
              <div
                key={room.id}
                className="grid gap-2 rounded-md bg-stone-50 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-stone-800">{room.name}</p>
                  <p className="text-xs text-stone-500">
                    {t("importedRoomUnavailabilityCount", { count: room.intervals.length })}
                  </p>
                </div>
                <Select
                  aria-label={t("mapRoomToLocation", { name: room.name })}
                  className="w-full"
                  value={mapping[room.id] ?? IGNORE_IMPORTED_ROOM}
                  onChange={(event) =>
                    setMapping((current) => ({ ...current, [room.id]: event.target.value }))
                  }
                >
                  <option value={IGNORE_IMPORTED_ROOM}>{t("ignoreImportedRoom")}</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          <Button type="button" onClick={apply} disabled={locations.length === 0}>
            {t("applyLocationUnavailabilityImport")}
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-3 text-sm text-stone-700">{message}</p>}
    </div>
  );
}
