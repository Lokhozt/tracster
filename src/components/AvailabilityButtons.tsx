"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "MAYBE";

const statusLabels: Record<AvailabilityStatus, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  MAYBE: "Maybe",
};

export function AvailabilityButtons({
  repetitionId,
  currentStatus,
}: {
  repetitionId: string;
  currentStatus?: AvailabilityStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<AvailabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitStatus(status: AvailabilityStatus) {
    setLoading(status);
    setError(null);

    const response = await fetch(`/api/repetitions/${repetitionId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    setLoading(null);

    if (!response.ok) {
      setError(data.error ?? "Unable to save availability.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(statusLabels) as AvailabilityStatus[]).map((status) => (
          <Button
            key={status}
            type="button"
            variant={currentStatus === status ? "primary" : "secondary"}
            disabled={loading !== null}
            onClick={() => submitStatus(status)}
          >
            {loading === status ? "Saving..." : statusLabels[status]}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
