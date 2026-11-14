"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, FormActions, FormError, Label, Select, ToggleRow } from "@/components/ui";
import { HOURS_24 } from "@/lib/datetime";
import type { SiteSettingsRecord } from "@/lib/site-settings";

export function SiteSettingsForm({ settings }: { settings: SiteSettingsRecord }) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [allowUserCreateChoreographies, setAllowUserCreateChoreographies] = useState(
    settings.allowUserCreateChoreographies,
  );
  const [allowUserCreateEvents, setAllowUserCreateEvents] = useState(
    settings.allowUserCreateEvents,
  );
  const [startOfDayHour, setStartOfDayHour] = useState(String(settings.startOfDayHour).padStart(2, "0"));
  const [showBirthdaysOnPlanning, setShowBirthdaysOnPlanning] = useState(
    settings.showBirthdaysOnPlanning,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowUserCreateChoreographies,
        allowUserCreateEvents,
        startOfDayHour: Number(startOfDayHour),
        showBirthdaysOnPlanning,
        showChoreographyTags: settings.showChoreographyTags,
      }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? t("settingsSaveError"));
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <h2 className="max-lg:sr-only mb-4 text-lg font-semibold">{t("siteSettings")}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ToggleRow
          label={t("allowCreateChoreographies")}
          hint={t("createChoreographiesHelp")}
          checked={allowUserCreateChoreographies}
          onChange={setAllowUserCreateChoreographies}
        />
        <ToggleRow
          label={t("allowCreateEvents")}
          hint={t("createEventsHelp")}
          checked={allowUserCreateEvents}
          onChange={setAllowUserCreateEvents}
        />
        <div>
          <Label htmlFor="start-of-day-hour">{t("startOfDay")}</Label>
          <Select
            id="start-of-day-hour"
            className="mt-1 block"
            value={startOfDayHour}
            onChange={(event) => setStartOfDayHour(event.target.value)}
          >
            {HOURS_24.map((hour) => (
              <option key={hour} value={hour}>
                {hour}h
              </option>
            ))}
          </Select>
          <p className="mt-1 text-sm text-stone-500">
            {t("startDayHelp")}
          </p>
        </div>
        <ToggleRow
          label={t("showBirthdaysOnPlanning")}
          hint={t("showBirthdaysOnPlanningHelp")}
          checked={showBirthdaysOnPlanning}
          onChange={setShowBirthdaysOnPlanning}
        />
        <FormError>{error}</FormError>
        {saved && !error && <p className="text-sm text-stone-600">{t("settingsSaved")}</p>}
        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("saveSettings")}
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
