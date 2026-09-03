"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

function ExitIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function LeaveEventButton({
  eventId,
  eventTitle,
  className,
}: {
  eventId: string;
  eventTitle: string;
  className?: string;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    if (!confirm(t("leaveConfirm", {title: eventTitle}))) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/events/${eventId}/join`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("leaveError"));
      return;
    }

    router.refresh();
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleLeave()}
        disabled={loading}
        className="rounded-lg p-2 text-stone-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        aria-label={t("leaveEvent")}
        title={t("leaveEvent")}
      >
        <ExitIcon />
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
