"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, Card, FormActions, Input, Label } from "@/components/ui";
import type { Language } from "@/i18n/config";

type ProfileFields = {
  firstName: string;
  lastName: string;
  phone: string | null;
  displayLanguage: Language;
  disableSeasonalStyle: boolean;
};

export function AccountProfileForm({
  user,
  seasonalStyleLockedByEnv,
}: {
  user: ProfileFields;
  seasonalStyleLockedByEnv: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("Account");
  const common = useTranslations("Common");
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [displayLanguage, setDisplayLanguage] = useState(user.displayLanguage);
  const [disableSeasonalStyle, setDisableSeasonalStyle] = useState(user.disableSeasonalStyle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        phone: phone || undefined,
        displayLanguage,
        disableSeasonalStyle,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? t("saveError"));
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <h2 className="mb-4 text-lg font-semibold">{t("profile")}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="account-first-name">{t("firstName")}</Label>
            <Input
              id="account-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div>
            <Label htmlFor="account-last-name">{t("lastName")}</Label>
            <Input
              id="account-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="account-phone">{t("phone")}</Label>
          <Input
            id="account-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            placeholder="+33 6 12 34 56 78"
          />
        </div>
        <div>
          <Label htmlFor="account-language">{common("language")}</Label>
          <select
            id="account-language"
            value={displayLanguage}
            onChange={(event) => setDisplayLanguage(event.target.value as Language)}
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-stone-900"
          >
            <option value="french">{common("french")}</option>
            <option value="english">{common("english")}</option>
          </select>
        </div>
        <div>
          <p className="text-sm font-medium text-stone-900">{t("seasonalStyle")}</p>
          {seasonalStyleLockedByEnv ? (
            <p className="mt-1 text-sm text-stone-600">{t("seasonalStyleDisabledBySite")}</p>
          ) : (
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={disableSeasonalStyle}
                onChange={(event) => setDisableSeasonalStyle(event.target.checked)}
                className="mt-0.5 rounded border-stone-300"
              />
              <span>
                <span className="font-medium">{t("disableSeasonalStyle")}</span>
                <span className="mt-0.5 block text-stone-500">{t("disableSeasonalStyleHelp")}</span>
              </span>
            </label>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && <p className="text-sm text-stone-600">{t("saved")}</p>}
        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? common("saving") : t("saveProfile")}
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
