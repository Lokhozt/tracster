"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import type { PartyBarPlanningReminder } from "@/lib/party-bar";

/**
 * One compact card listing the parties of the next two weeks that still need bar volunteers;
 * "see all" switches the planning to every party with a free bar slot.
 */
export function PartyBarPlanningReminders({
  reminders,
  onShowFreeSlots,
}: {
  reminders: PartyBarPlanningReminder[];
  onShowFreeSlots: () => void;
}) {
  const t = useTranslations("Components");
  const locale = useLocale();
  if (reminders.length === 0) {
    return null;
  }
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-900">
          {t("partyBarRemindersTitle", { count: reminders.length })}
        </h2>
        <button
          type="button"
          onClick={onShowFreeSlots}
          className="shrink-0 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          {t("partyBarRemindersSeeAll")}
        </button>
      </div>
      <ul className="divide-y divide-stone-100">
        {reminders.map((reminder) => (
          <li key={reminder.id}>
            <Link
              href={`/events/${reminder.id}`}
              className="flex min-h-11 items-center gap-2 text-sm text-stone-700 hover:text-stone-900"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-stone-900">{reminder.displayTitle}</span>
                {" · "}
                <time dateTime={reminder.startsAt} suppressHydrationWarning>
                  {dayFormatter.format(new Date(reminder.startsAt))}
                </time>
              </span>
              <span
                className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
                aria-label={t("partyBarFilledAria", {
                  filled: reminder.filledCount,
                  total: reminder.slotCount,
                })}
              >
                {reminder.filledCount}/{reminder.slotCount}
              </span>
              <span aria-hidden="true" className="text-stone-400">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
