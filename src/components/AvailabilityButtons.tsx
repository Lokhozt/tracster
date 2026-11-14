"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "MAYBE";

/**
 * The one way to answer a rehearsal (event page, choreography, planning list): the same three
 * choices everywhere, the current one marked (aria-pressed), and a clear message when offline.
 */
export function AvailabilityButtons({
  rehearsalId,
  currentStatus,
}: {
  rehearsalId: string;
  currentStatus?: AvailabilityStatus | null;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState<AvailabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitStatus(status: AvailabilityStatus) {
    setLoading(status);
    setError(null);

    try {
      const response = await fetch(`/api/events/${rehearsalId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? t("availabilitySaveError"));
        return;
      }
      router.refresh();
    } catch {
      // Never stay stuck on "Enregistrement…".
      setError(t("offlineRetry"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(["AVAILABLE", "UNAVAILABLE", "MAYBE"] as AvailabilityStatus[]).map((status) => (
          <Button
            key={status}
            type="button"
            variant={currentStatus === status ? "primary" : "secondary"}
            aria-pressed={currentStatus === status}
            disabled={loading !== null}
            onClick={() => submitStatus(status)}
          >
            {loading === status ? t("saving") : t(`status${status}`)}
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
