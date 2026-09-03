"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function DeleteEventButton({
  deleteUrl,
  confirmMessage,
  deleteBody,
  redirectTo,
  className,
}: {
  deleteUrl: string;
  confirmMessage: string;
  deleteBody?: Record<string, string>;
  redirectTo?: string;
  className?: string;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: deleteBody ? { "Content-Type": "application/json" } : undefined,
      body: deleteBody ? JSON.stringify(deleteBody) : undefined,
    });
    setLoading(false);

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? t("deleteError"));
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg p-2 text-stone-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        aria-label={t("delete")}
        title={t("delete")}
      >
        <TrashIcon />
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
