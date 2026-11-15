"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, Card, FormActions, FormError, Input, Label } from "@/components/ui";

type ProfileFields = {
  firstName: string;
  lastName: string;
  phone: string | null;
};

export function AccountProfileForm({
  user,
  bare = false,
  onSaved,
}: {
  user: ProfileFields;
  /** Without its card and heading (e.g. inside a sheet). */
  bare?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("Account");
  const common = useTranslations("Common");
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? "");
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
    onSaved?.();
  }

  const form = (
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
      <FormError>{error}</FormError>
      {saved && !error && <p className="text-sm text-stone-600">{t("saved")}</p>}
      <FormActions>
        <Button type="submit" disabled={saving}>
          {saving ? common("saving") : t("saveProfile")}
        </Button>
      </FormActions>
    </form>
  );

  if (bare) {
    return form;
  }

  return (
    <Card className="max-w-xl">
      <h2 className="mb-4 text-lg font-semibold">{t("profile")}</h2>
      {form}
    </Card>
  );
}
