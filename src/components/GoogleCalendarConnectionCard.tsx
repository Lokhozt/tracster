"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FollowAssociationCalendarLink } from "@/components/FollowAssociationCalendarLink";
import { Button, Card, Label, Select } from "@/components/ui";

type Connection = {
  calendarId: string;
  calendarName: string;
  accountEmail: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
} | null;

type CalendarOption = {
  id: string;
  name: string;
  primary: boolean;
};

export function GoogleCalendarConnectionCard({
  kind,
  connection,
  configured,
  result,
  followUrl,
}: {
  kind: "association" | "user";
  connection: Connection;
  configured: boolean;
  result?: string;
  followUrl?: string | null;
}) {
  const router = useRouter();
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedId, setSelectedId] = useState(connection?.calendarId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) {
      return;
    }
    fetch(`/api/google-calendar/calendars?kind=${kind}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          calendars?: CalendarOption[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load calendars.");
        }
        setCalendars(data.calendars ?? []);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load calendars.");
      });
  }, [connection, kind]);

  async function request(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const response = await fetch(path, init);
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Google Calendar request failed.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function changeCalendar() {
    const calendar = calendars.find(({ id }) => id === selectedId);
    if (!calendar) {
      return;
    }
    await request(`/api/google-calendar/connection?kind=${kind}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarId: calendar.id, calendarName: calendar.name }),
    });
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Google Calendar and remove synchronized events?")) {
      return;
    }
    await request(`/api/google-calendar/connection?kind=${kind}`, { method: "DELETE" });
  }

  const isAssociation = kind === "association";

  return (
    <Card className="max-w-xl">
      <h2 className="mb-2 text-lg font-semibold">
        {isAssociation ? "Association Google Calendar" : "My Google Calendar"}
      </h2>
      <p className="mb-4 text-sm text-stone-600">
        {isAssociation
          ? "Events, performances, competitions, demonstrations, festivals, and custom event types are copied to one shared calendar. Rehearsals are excluded."
          : "Your upcoming rehearsals are copied to your selected Google calendar. App unavailability and other association events are excluded."}
      </p>

      {!configured ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Set GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, SESSION_SECRET, and
          NEXT_PUBLIC_APP_URL to enable this integration.
        </p>
      ) : connection ? (
        <div className="space-y-4">
          <div className="text-sm text-stone-700">
            <p>
              Connected{connection.accountEmail ? ` as ${connection.accountEmail}` : ""}.
            </p>
            {connection.lastSyncedAt && (
              <p className="text-stone-500">
                Last synchronized {new Date(connection.lastSyncedAt).toLocaleString()}.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor={`google-calendar-${kind}`}>Destination calendar</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                id={`google-calendar-${kind}`}
                className="min-w-0 flex-1"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {calendars.length === 0 && (
                  <option value={connection.calendarId}>{connection.calendarName}</option>
                )}
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                    {calendar.primary ? " (primary)" : ""}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || selectedId === connection.calendarId}
                onClick={changeCalendar}
              >
                Use calendar
              </Button>
            </div>
          </div>
          {(connection.lastSyncError || error) && (
            <p className="text-sm text-red-700">{error ?? connection.lastSyncError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                request(`/api/google-calendar/sync?kind=${kind}`, { method: "POST" })
              }
            >
              {busy ? "Working..." : "Synchronize now"}
            </Button>
            <Button type="button" variant="danger" disabled={busy} onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <a
          href={`/api/google-calendar/connect?kind=${kind}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Connect Google Calendar
        </a>
      )}

      {followUrl && (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="mb-2 text-sm text-stone-600">
            Open the association's public Google calendar in a new tab.
          </p>
          <FollowAssociationCalendarLink href={followUrl} />
        </div>
      )}

      {result === "connected" && (
        <p className="mt-3 text-sm text-green-700">Google Calendar connected.</p>
      )}
      {result && result !== "connected" && (
        <p className="mt-3 text-sm text-red-700">
          Google Calendar was not connected. Please try again.
        </p>
      )}
    </Card>
  );
}
