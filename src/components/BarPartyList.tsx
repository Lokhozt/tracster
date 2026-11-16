"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PartyBarSlotList } from "@/components/PartyBarSlots";
import { Sheet } from "@/components/Sheet";
import { SegmentedControl } from "@/components/ui";
import type { BarParty } from "@/lib/party-bar";
import { cn } from "@/lib/utils";

type BarFilter = "all" | "free" | "mine";

function hasFreeSlot(party: BarParty): boolean {
  return party.filledCount < party.slotCount;
}

export function BarPartyList({
  parties,
  currentUserId,
}: {
  parties: BarParty[];
  currentUserId: string;
}) {
  const t = useTranslations("Pages.Bar");
  const tc = useTranslations("Components");
  const locale = useLocale();
  const [filter, setFilter] = useState<BarFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const openParty = parties.find((party) => party.id === openId) ?? null;

  const shown = parties.filter((party) =>
    filter === "free" ? hasFreeSlot(party) && !party.holdsSlot : filter === "mine" ? party.holdsSlot : true,
  );

  const dateTime = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    // Phones: one column. Computers: the cards flow into columns instead of a narrow strip.
    <div className="max-w-2xl space-y-4 lg:max-w-none">
      <SegmentedControl
        label={t("filterLabel")}
        value={filter}
        options={[
          { value: "all", label: t("filterAll") },
          { value: "free", label: t("filterFree") },
          { value: "mine", label: t("filterMine") },
        ]}
        onChange={setFilter}
        className="max-w-xl"
      />

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-stone-600">
          {parties.length === 0 ? t("emptyAll") : filter === "mine" ? t("emptyMine") : t("emptyFree")}
        </p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map((party) => (
            <li key={party.id}>
              <BarPartyCard party={party} onOpen={() => setOpenId(party.id)} />
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={openParty !== null}
        onClose={() => setOpenId(null)}
        title={openParty?.title ?? ""}
        headerAction={
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="shrink-0 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            {tc("close")}
          </button>
        }
      >
        {openParty && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600 first-letter:uppercase" suppressHydrationWarning>
              {dateTime.format(new Date(openParty.startsAt))}
              {openParty.location && ` · ${openParty.location}`}
            </p>
            <section>
              <h3 className="mb-2 text-xs font-semibold text-stone-500">{t("atTheBar")}</h3>
              <PartyBarSlotList
                eventId={openParty.id}
                title={openParty.title}
                slots={openParty.slots}
                currentUserId={currentUserId}
                canManage={openParty.canManage}
              />
            </section>
            <Link
              href={`/events/${openParty.id}`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-stone-900 underline-offset-4 hover:underline"
            >
              {t("openParty")} ›
            </Link>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** One party on a line: date, title, bar status, and + / − to take or leave a slot. */
function BarPartyCard({ party, onOpen }: { party: BarParty; onOpen: () => void }) {
  const t = useTranslations("Pages.Bar");
  const tc = useTranslations("Components");
  const locale = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = new Date(party.startsAt);
  const free = party.slotCount - party.filledCount;

  async function toggleSlot() {
    if (party.holdsSlot && !window.confirm(tc("partyBarLeaveConfirm"))) {
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/events/${party.id}/bar-slots`, {
      method: party.holdsSlot ? "DELETE" : "POST",
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? tc(party.holdsSlot ? "partyBarReleaseError" : "partyBarClaimError"));
      return;
    }
    router.refresh();
  }

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-xl border bg-white p-3 transition",
        party.holdsSlot ? "border-emerald-500 ring-1 ring-emerald-500" : "border-stone-200",
      )}
    >
      {/* Date block, as in the planning list. */}
      <div className="w-12 shrink-0 text-center" suppressHydrationWarning>
        <p className="text-xs font-medium text-stone-500">
          {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(start)}
        </p>
        <p className="font-display text-2xl leading-none tabular-nums">{start.getDate()}</p>
        <p className="text-xs text-stone-500">
          {new Intl.DateTimeFormat(locale, { month: "short" }).format(start)}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:rounded-xl"
      >
        <span className="block truncate font-semibold text-stone-900">{party.title}</span>
        <span className="block truncate text-sm text-stone-600" suppressHydrationWarning>
          {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(start)}
          {party.location && ` · ${party.location}`}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {party.holdsSlot ? (
            <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-white">✓ {t("badgeAtBar")}</span>
          ) : party.isAttending ? (
            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-white">{t("badgeAttending")}</span>
          ) : null}
          {free > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
              {t("badgeFree", { count: free })}
            </span>
          ) : (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-700">{t("badgeFull")}</span>
          )}
          <SlotDots filled={party.filledCount} total={party.slotCount} />
        </span>
        {error && <span className="mt-1 block text-xs font-normal text-red-600">{error}</span>}
      </button>

      {(party.holdsSlot || free > 0) && (
        <button
          type="button"
          onClick={() => void toggleSlot()}
          disabled={saving}
          aria-label={party.holdsSlot ? t("leaveSlot", { title: party.title }) : t("takeSlot", { title: party.title })}
          title={party.holdsSlot ? tc("partyBarLeaveSlot") : tc("partyBarTakeSlot")}
          className={cn(
            "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none transition active:scale-95 disabled:opacity-50",
            party.holdsSlot
              ? "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              : "bg-stone-900 text-white hover:bg-stone-700",
          )}
        >
          <span aria-hidden="true">{saving ? "…" : party.holdsSlot ? "−" : "+"}</span>
        </button>
      )}
    </div>
  );
}

/** "●●○": filled bar slots at a glance (the badge says it in words). */
function SlotDots({ filled, total }: { filled: number; total: number }) {
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn("size-2 rounded-full", index < filled ? "bg-stone-700" : "border border-stone-400")}
        />
      ))}
    </span>
  );
}
