"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export function ManualAvailabilityCheckButton({ eventId }: { eventId: string }) {
  const t = useTranslations("Pages.EventDetail");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkAvailability() {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/events/${eventId}/availability/check`, {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(
        typeof data.error === "string" ? data.error : t("manualAvailabilityCheckError"),
      );
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" disabled={loading} onClick={checkAvailability}>
        {loading ? t("manualAvailabilityChecking") : t("manualAvailabilityCheck")}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
