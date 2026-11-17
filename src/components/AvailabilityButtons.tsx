"use client";

import { useTranslations } from "next-intl";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "MAYBE";

const COMPACT_SELECTED: Record<AvailabilityStatus, string> = {
  AVAILABLE: "bg-emerald-700 text-white",
  UNAVAILABLE: "bg-red-700 text-white",
  MAYBE: "bg-amber-400 text-amber-950",
};

/**
 * The one way to answer a rehearsal (event page, choreography, planning list): the same three
 * choices everywhere, the current one marked (aria-pressed), and a clear message when offline.
 */
export function AvailabilityButtons({
  rehearsalId,
  currentStatus,
  compact = false,
}: {
  rehearsalId: string;
  currentStatus?: AvailabilityStatus | null;
  /** One slim switch with short labels (planning list); the answer is coloured. */
  compact?: boolean;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState<AvailabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The tapped answer shows at once; it falls back to the saved one if saving fails.
  const [optimistic, setOptimistic] = useState<AvailabilityStatus | null>(null);
  const [lastSaved, setLastSaved] = useState(currentStatus);
  if (currentStatus !== lastSaved) {
    // The server's answer arrived (refresh): it is the truth again.
    setLastSaved(currentStatus);
    setOptimistic(null);
  }
  const shownStatus = optimistic ?? currentStatus;

  async function submitStatus(status: AvailabilityStatus) {
    setLoading(status);
    setError(null);
    setOptimistic(status);

    try {
      const response = await fetch(`/api/events/${rehearsalId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? t("availabilitySaveError"));
        setOptimistic(null);
        return;
      }
      // Other parts of the page (counts, "Prochain rendez-vous") catch up in the background.
      startTransition(() => router.refresh());
    } catch {
      // Never stay stuck on "Enregistrement…".
      setError(t("offlineRetry"));
      setOptimistic(null);
    } finally {
      setLoading(null);
    }
  }

  if (compact) {
    return (
      <div className="space-y-1">
        <div
          role="group"
          aria-label={t("availabilityGroupLabel")}
          className="inline-flex rounded-full border border-stone-200 bg-stone-50 p-0.5"
        >
          {(["AVAILABLE", "UNAVAILABLE", "MAYBE"] as AvailabilityStatus[]).map((status) => {
            const selected = shownStatus === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={selected}
                aria-label={t(`status${status}`)}
                disabled={loading !== null}
                onClick={() => {
                  if (!selected) void submitStatus(status);
                }}
                className={cn(
                  // Slim (28px) to suit the card; the after: area keeps a ~44px touch target.
                  "relative h-7 rounded-full px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-(--duration-medium) after:absolute after:-inset-x-0.5 after:-inset-y-2 disabled:opacity-60",
                  selected ? COMPACT_SELECTED[status] : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-900",
                )}
              >
                {t(`statusShort${status}`)}
              </button>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {(["AVAILABLE", "UNAVAILABLE", "MAYBE"] as AvailabilityStatus[]).map((status) => (
          <Button
            key={status}
            type="button"
            variant={shownStatus === status ? "primary" : "secondary"}
            className="w-full px-2"
            aria-pressed={shownStatus === status}
            disabled={loading !== null}
            onClick={() => submitStatus(status)}
          >
            {loading === status ? (
              t("saving")
            ) : (
              <>
                {shownStatus === status && (
                  <svg viewBox="0 0 24 24" className="chip-pop mr-1 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                )}
                {t(`status${status}`)}
              </>
            )}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
