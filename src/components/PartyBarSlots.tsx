"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LocalDateTime } from "@/components/LocalDateTime";
import type { PartyBarSlot } from "@/lib/party-bar-shared";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "@/components/icons";

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}

// Phones: one full-width row per slot (full names fit). From `sm`: three slots side by side.
const SLOT_CHIP =
  "flex min-h-10 w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm sm:min-h-11 sm:justify-center sm:px-2 sm:text-center";
const PHONE_HINT = "ml-auto shrink-0 text-xs opacity-70 sm:hidden";

function SlotChip({
  index,
  slot,
  eventId,
  currentUserId,
  canManage,
  readOnly,
  onError,
}: {
  index: number;
  slot: PartyBarSlot;
  eventId: string;
  currentUserId: string;
  canManage: boolean;
  readOnly: boolean;
  onError: (message: string | null) => void;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const slotLabel = t("partyBarSlotLabel", { index: index + 1 });

  async function updateSlot(
    method: "POST" | "DELETE",
    fallbackErrorKey: "partyBarClaimError" | "partyBarReleaseError",
    body?: { userId: string },
  ) {
    setLoading(true);
    onError(null);
    const response = await fetch(`/api/events/${eventId}/bar-slots`, {
      method,
      ...(body
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    });
    setLoading(false);
    if (!response.ok) {
      onError(await responseError(response, t(fallbackErrorKey)));
      return;
    }
    router.refresh();
  }

  if (!slot) {
    if (readOnly) {
      return (
        <div className={cn(SLOT_CHIP, "border border-dashed border-stone-300 text-stone-400")} aria-label={`${slotLabel} : ${t("partyBarSlotEmpty")}`}>
          <span className="truncate">{t("partyBarSlotEmpty")}</span>
        </div>
      );
    }
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void updateSlot("POST", "partyBarClaimError")}
        aria-label={`${t("partyBarTakeSlot")} (${slotLabel})`}
        className={cn(
          SLOT_CHIP,
          "justify-center border border-dashed border-stone-400 font-medium text-stone-800 transition hover:border-stone-900 hover:bg-white active:scale-95 disabled:opacity-50",
        )}
      >
        {loading ? t("saving") : <span className="truncate">＋ {t("partyBarTakeShort")}</span>}
      </button>
    );
  }

  if (slot.userId === currentUserId) {
    const mine = <span className="truncate font-semibold">✓ {t("partyBarYou")}</span>;
    const leaveHint = <span aria-hidden="true" className={PHONE_HINT}>{t("partyBarLeaveShort")}</span>;
    if (readOnly) {
      return <div className={cn(SLOT_CHIP, "bg-emerald-700 text-white")} aria-label={`${slotLabel} : ${slot.name}`}>{mine}</div>;
    }
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          if (confirm(t("partyBarLeaveConfirm"))) {
            void updateSlot("DELETE", "partyBarReleaseError");
          }
        }}
        aria-label={`${t("partyBarLeaveSlot")} (${slotLabel})`}
        title={t("partyBarLeaveSlot")}
        className={cn(SLOT_CHIP, "bg-emerald-700 text-white transition hover:bg-emerald-800 active:scale-95 disabled:opacity-50")}
      >
        {loading ? t("saving") : <>{mine}{leaveHint}</>}
      </button>
    );
  }

  const otherChip = cn(SLOT_CHIP, "bg-stone-100 text-stone-800");
  if (!canManage || readOnly) {
    return (
      <div className={otherChip} title={slot.name} aria-label={`${slotLabel} : ${slot.name}`}>
        <span className="truncate">{slot.name}</span>
      </div>
    );
  }
  // Managers remove a volunteer by tapping their slot (no separate bin icon to squeeze in).
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        if (confirm(t("removeParticipantEvent", { name: slot.name }))) {
          void updateSlot("DELETE", "partyBarReleaseError", { userId: slot.userId });
        }
      }}
      title={slot.name}
      aria-label={t("partyBarRemoveVolunteer", { name: slot.name, slot: slotLabel })}
      className={cn(otherChip, "transition hover:bg-red-50 hover:text-red-700 active:scale-95 disabled:opacity-50")}
    >
      {loading ? (
        t("saving")
      ) : (
        <>
          <span className="truncate">{slot.name}</span>
          <span aria-hidden="true" className={PHONE_HINT}>×</span>
        </>
      )}
    </button>
  );
}

export function PartyBarEventCard({
  eventId,
  title,
  startsAt,
  href,
  slots,
  currentUserId,
  canManage,
  readOnly = false,
}: {
  eventId: string;
  title: string;
  startsAt: string;
  href?: string;
  slots: PartyBarSlot[];
  currentUserId: string;
  canManage: boolean;
  readOnly?: boolean;
}) {
  const t = useTranslations("Components");
  const [error, setError] = useState<string | null>(null);
  const isRegistered = slots.some((slot) => slot?.userId === currentUserId);
  const filledCount = slots.filter(Boolean).length;

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isRegistered ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400" : "border-stone-200",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {href ? (
            <Link href={href} className="font-semibold break-words text-stone-900 hover:text-stone-700">
              {title}
              <ChevronRightIcon className="ml-1 inline" />
            </Link>
          ) : (
            <p className="font-semibold break-words text-stone-900">{title}</p>
          )}
          <p className="text-sm text-stone-600">
            <LocalDateTime value={startsAt} />
          </p>
        </div>
        {isRegistered ? (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
            ✓ <span className="sm:hidden">{t("partyBarYouAreInShort")}</span>
            <span className="max-sm:hidden">{t("partyBarYouAreIn")}</span>
          </span>
        ) : (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
              filledCount === slots.length ? "bg-stone-200 text-stone-700" : "bg-amber-100 text-amber-900",
            )}
            aria-label={t("partyBarFilledAria", { filled: filledCount, total: slots.length })}
          >
            {filledCount}/{slots.length}
          </span>
        )}
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-3 sm:gap-2" aria-label={t("partyBarSlotsAria", { title })}>
        {slots.map((slot, index) => (
          <li key={index} className="min-w-0">
            <SlotChip
              index={index}
              slot={slot}
              eventId={eventId}
              currentUserId={currentUserId}
              canManage={canManage}
              readOnly={readOnly}
              onError={setError}
            />
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
