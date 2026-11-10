"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LocalDateTime } from "@/components/LocalDateTime";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import type { PartyBarSlot } from "@/lib/party-bar-shared";
import { Button, Card } from "@/components/ui";

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}

function SlotRow({
  index,
  slot,
  eventId,
  currentUserId,
  canManage,
}: {
  index: number;
  slot: PartyBarSlot;
  eventId: string;
  currentUserId: string;
  canManage: boolean;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMine = slot?.userId === currentUserId;

  async function claimSlot() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/events/${eventId}/bar-slots`, { method: "POST" });
    setLoading(false);
    if (!response.ok) {
      setError(await responseError(response, t("partyBarClaimError")));
      return;
    }
    router.refresh();
  }

  async function releaseSlot() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/events/${eventId}/bar-slots`, { method: "DELETE" });
    setLoading(false);
    if (!response.ok) {
      setError(await responseError(response, t("partyBarReleaseError")));
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
          {t("partyBarSlotLabel", { index: index + 1 })}
        </p>
        {slot ? (
          <p className="font-medium text-stone-900">{slot.name}</p>
        ) : (
          <p className="text-sm text-stone-500">{t("partyBarSlotEmpty")}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        {!slot && (
          <Button type="button" disabled={loading} onClick={claimSlot}>
            {loading ? t("saving") : t("partyBarTakeSlot")}
          </Button>
        )}
        {isMine && (
          <Button type="button" variant="secondary" disabled={loading} onClick={releaseSlot}>
            {loading ? t("saving") : t("partyBarLeaveSlot")}
          </Button>
        )}
        {slot && canManage && !isMine && (
          <DeleteEventButton
            deleteUrl={`/api/events/${eventId}/bar-slots`}
            deleteBody={{ userId: slot.userId }}
            confirmMessage={t("removeParticipantEvent", { name: slot.name })}
          />
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </li>
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

  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {href ? (
            <Link href={href} className="font-semibold text-stone-900 hover:text-stone-700">
              {title}
            </Link>
          ) : (
            <p className="font-semibold text-stone-900">{title}</p>
          )}
          <p className="mt-1 text-sm text-stone-600">
            <LocalDateTime value={startsAt} />
          </p>
        </div>
        {href && (
          <Link href={href} className="text-sm font-medium text-stone-600 hover:text-stone-900">
            {t("partyBarViewEvent")}
          </Link>
        )}
      </div>
      {readOnly ? (
        <ul className="space-y-1" aria-label={t("partyBarSlotsAria", { title })}>
          {slots.map((slot, index) => (
            <li key={index} className="text-sm text-stone-700">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {t("partyBarSlotLabel", { index: index + 1 })}
                {": "}
              </span>
              {slot ? slot.name : t("partyBarSlotEmpty")}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2" aria-label={t("partyBarSlotsAria", { title })}>
          {slots.map((slot, index) => (
            <SlotRow
              key={index}
              index={index}
              slot={slot}
              eventId={eventId}
              currentUserId={currentUserId}
              canManage={canManage}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type TracBarListFilter = "open" | "all";

function partyHasOpenBarSlot(slots: PartyBarSlot[]): boolean {
  return slots.some((slot) => slot === null);
}

export function TracBarCategoryPanel({
  parties,
  pastParties = [],
  currentUserId,
  canManage,
  showPastSeason = false,
}: {
  parties: {
    id: string;
    displayTitle: string;
    startsAt: string;
    slots: PartyBarSlot[];
  }[];
  pastParties?: {
    id: string;
    displayTitle: string;
    startsAt: string;
    slots: PartyBarSlot[];
  }[];
  currentUserId: string;
  canManage: boolean;
  showPastSeason?: boolean;
}) {
  const t = useTranslations("Components");
  const [listFilter, setListFilter] = useState<TracBarListFilter>("open");
  const [showPast, setShowPast] = useState(false);

  const visibleParties = useMemo(() => {
    if (listFilter === "all") {
      return parties;
    }
    return parties.filter((party) => partyHasOpenBarSlot(party.slots));
  }, [parties, listFilter]);

  const emptyMessage =
    parties.length === 0
      ? t("tracBarEmpty")
      : listFilter === "open"
        ? t("tracBarEmptyOpenSlots")
        : t("tracBarEmpty");

  return (
    <Card>
      <p className="mb-4 text-sm text-stone-600">{t("tracBarHelp")}</p>
      {(parties.length > 0 || showPastSeason) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {parties.length > 0 && (
            <>
              <Button
                type="button"
                variant={listFilter === "open" ? "primary" : "secondary"}
                onClick={() => setListFilter("open")}
              >
                {t("tracBarFilterOpenSlots")}
              </Button>
              <Button
                type="button"
                variant={listFilter === "all" ? "primary" : "secondary"}
                onClick={() => setListFilter("all")}
              >
                {t("tracBarFilterAll")}
              </Button>
            </>
          )}
          {showPastSeason && (
            <label
              className={`flex cursor-pointer items-center gap-2 text-sm text-stone-700${parties.length > 0 ? " ml-auto" : ""}`}
            >
              <input
                type="checkbox"
                checked={showPast}
                onChange={(event) => setShowPast(event.target.checked)}
                className="rounded border-stone-300"
              />
              {t("tracBarShowPastSeason")}
            </label>
          )}
        </div>
      )}
      {visibleParties.length === 0 ? (
        <p className="text-sm text-stone-600">{emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          {visibleParties.map((party) => (
            <PartyBarEventCard
              key={party.id}
              eventId={party.id}
              title={party.displayTitle}
              startsAt={party.startsAt}
              href={`/events/${party.id}`}
              slots={party.slots}
              currentUserId={currentUserId}
              canManage={canManage}
            />
          ))}
        </div>
      )}
      {showPastSeason && showPast && (
        <div className="mt-6 space-y-4 border-t border-stone-200 pt-6">
          <h3 className="text-sm font-semibold text-stone-900">{t("tracBarPastSeasonTitle")}</h3>
          {pastParties.length === 0 ? (
            <p className="text-sm text-stone-600">{t("tracBarPastSeasonEmpty")}</p>
          ) : (
            pastParties.map((party) => (
              <PartyBarEventCard
                key={party.id}
                eventId={party.id}
                title={party.displayTitle}
                startsAt={party.startsAt}
                href={`/events/${party.id}`}
                slots={party.slots}
                currentUserId={currentUserId}
                canManage={false}
                readOnly
              />
            ))
          )}
        </div>
      )}
    </Card>
  );
}
