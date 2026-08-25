"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Label, Select } from "@/components/ui";
import { HOURS_24 } from "@/lib/datetime";
import type { SiteSettingsRecord } from "@/lib/site-settings";

export function SiteSettingsForm({ settings }: { settings: SiteSettingsRecord }) {
  const router = useRouter();
  const [allowUserCreateChoreographies, setAllowUserCreateChoreographies] = useState(
    settings.allowUserCreateChoreographies,
  );
  const [allowUserCreateEvents, setAllowUserCreateEvents] = useState(
    settings.allowUserCreateEvents,
  );
  const [startOfDayHour, setStartOfDayHour] = useState(String(settings.startOfDayHour).padStart(2, "0"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowUserCreateChoreographies,
        allowUserCreateEvents,
        startOfDayHour: Number(startOfDayHour),
      }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to save settings.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <h2 className="mb-4 text-lg font-semibold">Site settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={allowUserCreateChoreographies}
            onChange={(event) => setAllowUserCreateChoreographies(event.target.checked)}
            className="mt-0.5 rounded border-stone-300"
          />
          <span>
            <span className="font-medium">Allow users to create choreographies</span>
            <span className="mt-0.5 block text-stone-500">
              When off, only admins and the owner can create choreographies.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={allowUserCreateEvents}
            onChange={(event) => setAllowUserCreateEvents(event.target.checked)}
            className="mt-0.5 rounded border-stone-300"
          />
          <span>
            <span className="font-medium">Allow users to create events</span>
            <span className="mt-0.5 block text-stone-500">
              When off, only admins and the owner can create events.
            </span>
          </span>
        </label>
        <div>
          <Label htmlFor="start-of-day-hour">Start of day</Label>
          <Select
            id="start-of-day-hour"
            className="mt-1 block"
            value={startOfDayHour}
            onChange={(event) => setStartOfDayHour(event.target.value)}
          >
            {HOURS_24.map((hour) => (
              <option key={hour} value={hour}>
                {hour}h
              </option>
            ))}
          </Select>
          <p className="mt-1 text-sm text-stone-500">
            The unavailability calendar begins at this hour. Default is 8h.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && <p className="text-sm text-stone-600">Settings saved.</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </form>
    </Card>
  );
}
