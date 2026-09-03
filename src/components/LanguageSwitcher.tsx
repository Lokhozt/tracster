"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Language } from "@/i18n/config";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const language: Language = locale === "en" ? "english" : "french";

  async function changeLanguage(nextLanguage: Language) {
    setSaving(true);
    const response = await fetch("/api/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: nextLanguage }),
    });
    setSaving(false);

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm text-stone-600">
      {!compact && <span>{t("language")}</span>}
      <select
        value={language}
        disabled={saving}
        aria-label={t("language")}
        onChange={(event) => changeLanguage(event.target.value as Language)}
        className="min-h-10 rounded-lg border border-stone-300 bg-white px-2 text-stone-900"
      >
        <option value="french">{t("french")}</option>
        <option value="english">{t("english")}</option>
      </select>
    </label>
  );
}
