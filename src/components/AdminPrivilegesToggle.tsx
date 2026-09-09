"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

export function AdminPrivilegesToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const t = useTranslations("Account");
  const [on, setOn] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setSaving(true);
    setError(null);

    const response = await fetch("/api/users/me/admin-privileges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const data = (await response.json()) as {
      error?: string;
      adminPrivilegesEnabled?: boolean;
    };
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? t("adminPrivilegesError"));
      return;
    }

    setOn(data.adminPrivilegesEnabled ?? next);
    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <h2 className="mb-2 text-lg font-semibold">{t("adminPrivileges")}</h2>
      <p className="mb-4 text-sm text-stone-600">{t("adminPrivilegesHelp")}</p>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={on}
          disabled={saving}
          onChange={(event) => void toggle(event.target.checked)}
          className="mt-0.5 rounded border-stone-300"
        />
        <span>
          <span className="font-medium">{t("adminPrivilegesLabel")}</span>
          <span className="mt-0.5 block text-stone-500">
            {on ? t("adminPrivilegesOn") : t("adminPrivilegesOff")}
          </span>
        </span>
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
