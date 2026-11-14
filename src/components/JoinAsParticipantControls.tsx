"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const PILL =
  "inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium pointer-coarse:min-h-11 transition active:scale-95 disabled:opacity-60";
const PILL_ON = "bg-emerald-700 text-white hover:bg-emerald-800";
const PILL_OFF = "border border-stone-300 bg-white text-stone-900 hover:bg-stone-100";
const PILL_PENDING = "bg-stone-200 text-stone-700 hover:bg-stone-300";

type PendingAction = { url: string; method: "POST" | "DELETE" };

export function JoinAsParticipantControls({
  joinUrl,
  requestUrl,
  allowJoin,
  allowRequest,
  allowLeave = false,
  isParticipant,
  hasPendingRequest,
  hasUpcomingSeries = false,
}: {
  joinUrl: string;
  requestUrl: string;
  allowJoin: boolean;
  allowRequest: boolean;
  allowLeave?: boolean;
  isParticipant: boolean;
  hasPendingRequest: boolean;
  hasUpcomingSeries?: boolean;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (!pending) {
      return;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPending(null);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [pending]);

  if (!isParticipant && !allowJoin && !allowRequest && !hasPendingRequest) {
    return null;
  }

  async function submit(url: string, method: "POST" | "DELETE", applyToUpcoming: boolean) {
    setLoading(true);
    setError(null);
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applyToUpcoming }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(
        data.error ??
          (method === "DELETE" ? t("leaveError") : t("participationUpdateError")),
      );
      return;
    }

    router.refresh();
  }

  function startAction(url: string, method: "POST" | "DELETE") {
    if (!hasUpcomingSeries) {
      void submit(url, method, false);
      return;
    }
    setPending({ url, method });
  }

  function confirmScope(applyToUpcoming: boolean) {
    if (!pending) {
      return;
    }
    const action = pending;
    setPending(null);
    void submit(action.url, action.method, applyToUpcoming);
  }

  // One compact pill shows the current state and toggles it (no separate status + button row).
  let pill: React.ReactNode;
  if (isParticipant) {
    pill = allowLeave ? (
      <button
        type="button"
        className={cn(PILL, PILL_ON)}
        disabled={loading}
        aria-label={t("notParticipatingAction")}
        title={t("notParticipatingAction")}
        onClick={() => {
          if (confirm(t("leaveParticipationConfirm"))) {
            startAction(joinUrl, "DELETE");
          }
        }}
      >
        {loading ? t("leaving") : <>✓ {t("iAmParticipating")}</>}
      </button>
    ) : (
      <span className={cn(PILL, PILL_ON)}>✓ {t("iAmParticipating")}</span>
    );
  } else if (hasPendingRequest) {
    pill = (
      <button
        type="button"
        className={cn(PILL, PILL_PENDING)}
        disabled={loading}
        aria-label={t("cancelRequest")}
        title={t("joinRequestPending")}
        onClick={() => {
          if (confirm(t("cancelRequestConfirm"))) {
            void submit(requestUrl, "DELETE", false);
          }
        }}
      >
        {loading ? t("cancelling") : t("requestSent")}
      </button>
    );
  } else if (allowJoin) {
    pill = (
      <button
        type="button"
        className={cn(PILL, PILL_OFF)}
        disabled={loading}
        onClick={() => startAction(joinUrl, "POST")}
      >
        {loading ? t("joining") : t("joinAsParticipant")}
      </button>
    );
  } else {
    pill = (
      <button
        type="button"
        className={cn(PILL, PILL_OFF)}
        disabled={loading}
        onClick={() => void submit(requestUrl, "POST", false)}
      >
        {loading ? t("sending") : t("requestToJoin")}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {pill}
      {error && <p className="max-w-56 text-right text-xs text-red-600">{error}</p>}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="participation-series-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPending(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 id="participation-series-title" className="text-lg font-semibold">
              {t("applyParticipationToUpcomingTitle")}
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {t("applyParticipationToUpcomingHelp")}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setPending(null)}>
                {t("cancel")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => confirmScope(false)}>
                {t("thisEventOnly")}
              </Button>
              <Button type="button" onClick={() => confirmScope(true)}>
                {t("allFutureEvents")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
