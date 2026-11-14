"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FAB_MENU_ITEM_CLASS } from "@/components/FloatingActionButton";
import { Button } from "@/components/ui";

export function ManualAvailabilityCheckButton({
  eventId,
  variant = "button",
}: {
  eventId: string;
  /** "menuItem": styled as an entry of the floating "+" menu. */
  variant?: "button" | "menuItem";
}) {
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
      const message =
        typeof data.error === "string" ? data.error : t("manualAvailabilityCheckError");
      if (variant === "menuItem") {
        // The "+" menu closes on click, so the inline error would never be seen.
        window.alert(message);
      } else {
        setError(message);
      }
      return;
    }

    router.refresh();
  }

  const label = loading ? t("manualAvailabilityChecking") : t("manualAvailabilityCheck");

  if (variant === "menuItem") {
    return (
      // data-fab-close: picking this entry closes the "+" menu; the check runs in the background.
      <button
        type="button"
        data-fab-close=""
        className={FAB_MENU_ITEM_CLASS}
        disabled={loading}
        onClick={checkAvailability}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" disabled={loading} onClick={checkAvailability}>
        {label}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
