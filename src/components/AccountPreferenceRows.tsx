"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SegmentedControl, Switch } from "@/components/ui";
import type { Language } from "@/i18n/config";

type Preferences = { displayLanguage?: Language; disableSeasonalStyle?: boolean };

/** Saves one preference right away; returns false (with the error shown) when it fails. */
function usePreferenceSaver() {
  const router = useRouter();
  const t = useTranslations("Account");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(preferences: Preferences): Promise<boolean> {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? t("saveError"));
      return false;
    }
    router.refresh();
    return true;
  }

  return { save, saving, error };
}

export function LanguagePreferenceRow({ initial }: { initial: Language }) {
  const t = useTranslations("Account");
  const common = useTranslations("Common");
  const [language, setLanguage] = useState(initial);
  const { save, saving, error } = usePreferenceSaver();

  async function change(next: Language) {
    const previous = language;
    setLanguage(next);
    if (!(await save({ displayLanguage: next }))) {
      setLanguage(previous);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{t("languageShort")}</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <SegmentedControl
        label={common("language")}
        value={language}
        options={[
          { value: "french", label: "Français" },
          { value: "english", label: "English" },
        ]}
        onChange={(next) => {
          if (!saving && next !== language) {
            void change(next);
          }
        }}
        className="w-44 shrink-0"
      />
    </div>
  );
}

export function SeasonalStylePreferenceRow({
  initialDisabled,
  lockedByEnv,
}: {
  initialDisabled: boolean;
  lockedByEnv: boolean;
}) {
  const t = useTranslations("Account");
  const [hidden, setHidden] = useState(initialDisabled);
  const { save, saving, error } = usePreferenceSaver();

  async function change(next: boolean) {
    setHidden(next);
    if (!(await save({ disableSeasonalStyle: next }))) {
      setHidden(!next);
    }
  }

  if (lockedByEnv) {
    return (
      <div className="px-4 py-3">
        <p className="font-medium">{t("seasonalStyle")}</p>
        <p className="text-xs text-stone-500">{t("seasonalStyleDisabledBySite")}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{t("disableSeasonalStyle")}</p>
        <p className="text-xs text-stone-500">{t("disableSeasonalStyleHelp")}</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <Switch
        checked={hidden}
        onChange={(next) => void change(next)}
        label={t("disableSeasonalStyle")}
        disabled={saving}
      />
    </div>
  );
}
