"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { PartyBarPlanningReminder } from "@/lib/party-bar";

export function PartyBarPlanningReminders({
  reminders,
}: {
  reminders: PartyBarPlanningReminder[];
}) {
  const t = useTranslations("Components");
  if (reminders.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-3">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="flex flex-col gap-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium text-fuchsia-950">
            {t("partyBarPlanningReminder", {
              title: reminder.displayTitle,
              filled: reminder.filledCount,
              total: reminder.slotCount,
            })}
          </p>
          <Link
            href={`/events/${reminder.id}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-fuchsia-900 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-800"
          >
            {t("partyBarPlanningReminderCta")}
          </Link>
        </div>
      ))}
    </div>
  );
}
