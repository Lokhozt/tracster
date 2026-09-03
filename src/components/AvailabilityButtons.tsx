"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "MAYBE";

export function AvailabilityButtons({
  rehearsalId,
  currentStatus,
}: {
  rehearsalId: string;
  currentStatus?: AvailabilityStatus;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState<AvailabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitStatus(status: AvailabilityStatus) {
    setLoading(status);
    setError(null);

    const response = await fetch(`/api/events/${rehearsalId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    setLoading(null);

    if (!response.ok) {
      setError(data.error ?? t("availabilitySaveError"));
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(["AVAILABLE", "UNAVAILABLE", "MAYBE"] as AvailabilityStatus[]).map((status) => (
          <Button
            key={status}
            type="button"
            variant={currentStatus === status ? "primary" : "secondary"}
            disabled={loading !== null}
            onClick={() => submitStatus(status)}
          >
            {loading === status ? t("saving") : t(`status${status}`)}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
