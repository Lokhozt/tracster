"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, FormError, SegmentedControl } from "@/components/ui";
import { feedSelectionQuery, type FeedSelection, type FeedTypeChoice } from "@/lib/calendar-feed";
import { eventCategoryClassName } from "@/lib/event-category-filter";
import type { EventKind } from "@/lib/event-type-helpers";
import { cn } from "@/lib/utils";

/** This device remembers the last choice, so the link shown matches the one subscribed. */
const SELECTION_STORAGE_KEY = "tracster.calendarFeedSelection";

type FeedEventType = { id: string; name: string; kind: EventKind | null };

function readStoredSelection(): FeedSelection | null {
  try {
    const raw = window.localStorage.getItem(SELECTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FeedSelection) : null;
  } catch {
    return null;
  }
}

function storeSelection(selection: FeedSelection) {
  try {
    window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Private browsing: the choice is simply not remembered.
  }
}

export function CalendarFeedSettings({
  initialToken,
  appUrl,
  eventTypes,
}: {
  initialToken: string | null;
  /** The app's public address; the browser's own origin when not configured. */
  appUrl: string | null;
  eventTypes: FeedEventType[];
}) {
  const t = useTranslations("Pages.CalendarFeed");
  const [token, setToken] = useState(initialToken);
  const [selection, setSelection] = useState<FeedSelection>(() =>
    Object.fromEntries(eventTypes.map((type) => [type.id, "mine" as FeedTypeChoice])),
  );
  const [origin, setOrigin] = useState(appUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Android has no handler for webcal:// links, and Google only adds a calendar by URL from a
  // computer: there, copying the link is the way.
  const [isAndroid, setIsAndroid] = useState(false);

  // Browser-only values (origin, remembered choice) are read after mount.
  useEffect(() => {
    const stored = readStoredSelection();
    const timer = window.setTimeout(() => {
      if (!appUrl) setOrigin(window.location.origin);
      setIsAndroid(/android/i.test(navigator.userAgent));
      if (stored) {
        setSelection((current) =>
          Object.fromEntries(Object.keys(current).map((id) => [id, stored[id] ?? current[id]])),
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [appUrl]);

  const feedUrl = useMemo(() => {
    if (!token || !origin) return null;
    return `${origin.replace(/\/$/, "")}/api/calendar/${token}.ics?${feedSelectionQuery(selection)}`;
  }, [origin, selection, token]);
  const webcalUrl = feedUrl?.replace(/^https?:\/\//, "webcal://") ?? null;
  const googleUrl = webcalUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
    : null;
  const nothingSelected = Object.values(selection).every((choice) => choice === "off");

  function choose(typeId: string, choice: FeedTypeChoice) {
    const next = { ...selection, [typeId]: choice };
    setSelection(next);
    setCopied(false);
    storeSelection(next);
  }

  async function changeToken(method: "POST" | "DELETE") {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/users/me/calendar-feed", { method });
    setBusy(false);
    if (!response.ok) {
      setError(t("error"));
      return;
    }
    const data = (await response.json()) as { token: string | null };
    setToken(data.token);
    setCopied(false);
  }

  async function copy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
    } catch {
      setError(t("copyError"));
    }
  }

  if (!token) {
    return (
      <Card className="max-w-xl space-y-3">
        <p className="text-stone-700">{t("intro")}</p>
        <FormError>{error}</FormError>
        <Button type="button" onClick={() => void changeToken("POST")} disabled={busy}>
          {t("create")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <p className="px-1 text-stone-700">{t("intro")}</p>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold text-stone-500">{t("typesTitle")}</h2>
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {eventTypes.map((type) => (
            <li key={type.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium",
                  eventCategoryClassName(type.kind),
                )}
              >
                <span aria-hidden="true" className="size-2 rounded-full bg-current" />
                {type.name}
              </span>
              <SegmentedControl
                label={type.name}
                value={selection[type.id] ?? "off"}
                options={[
                  { value: "off", label: t("choiceOff") },
                  { value: "mine", label: t("choiceMine") },
                  { value: "all", label: t("choiceAll") },
                ]}
                onChange={(choice) => choose(type.id, choice)}
                className="w-full sm:w-64"
              />
            </li>
          ))}
        </ul>
        <p className="mt-2 px-1 text-xs text-stone-500">{t("typesHint")}</p>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold text-stone-500">{t("linkTitle")}</h2>
        <Card className="space-y-3">
          {nothingSelected ? (
            <p className="text-sm text-stone-600">{t("nothingSelected")}</p>
          ) : (
            <>
              <input
                readOnly
                value={feedUrl ?? ""}
                aria-label={t("linkTitle")}
                onFocus={(event) => event.currentTarget.select()}
                className="min-h-11 w-full truncate rounded-lg border border-stone-300 bg-stone-50 px-3 font-mono text-xs text-stone-700"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void copy()}>
                  {copied ? t("copied") : t("copy")}
                </Button>
                {googleUrl && !isAndroid && (
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100"
                  >
                    {t("addToGoogle")}
                  </a>
                )}
                {webcalUrl && !isAndroid && (
                  <a
                    href={webcalUrl}
                    className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100"
                  >
                    {t("openInCalendar")}
                  </a>
                )}
              </div>
              {isAndroid && (
                <div className="space-y-1 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
                  <p>{t("androidDigiCal")}</p>
                  <p>{t("androidGoogle")}</p>
                </div>
              )}
            </>
          )}
          <ul className="list-disc space-y-1 pl-5 text-xs text-stone-500">
            <li>{t("noteOneWay")}</li>
            <li>{t("noteDelay")}</li>
            <li>{t("noteSecret")}</li>
          </ul>
        </Card>
      </section>

      <FormError>{error}</FormError>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            if (window.confirm(t("regenerateConfirm"))) void changeToken("POST");
          }}
        >
          {t("regenerate")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (window.confirm(t("disableConfirm"))) void changeToken("DELETE");
          }}
        >
          {t("disable")}
        </Button>
      </div>
    </div>
  );
}
