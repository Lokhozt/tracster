"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

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

  if (
    (isParticipant && !allowLeave) ||
    (!isParticipant && !allowJoin && !allowRequest && !hasPendingRequest)
  ) {
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

  return (
    <div className="space-y-2">
      {isParticipant && allowLeave && (
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => startAction(joinUrl, "DELETE")}
        >
          {loading ? t("leaving") : t("notParticipatingAction")}
        </Button>
      )}
      {!isParticipant && allowJoin && (
        <Button type="button" disabled={loading} onClick={() => startAction(joinUrl, "POST")}>
          {loading ? t("joining") : t("joinAsParticipant")}
        </Button>
      )}
      {!isParticipant && allowRequest && !hasPendingRequest && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => void submit(requestUrl, "POST", false)}
        >
          {loading ? t("sending") : t("requestToJoin")}
        </Button>
      )}
      {!isParticipant && hasPendingRequest && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-stone-600">{t("joinRequestPending")}</p>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => void submit(requestUrl, "DELETE", false)}
          >
            {loading ? t("cancelling") : t("cancelRequest")}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
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
