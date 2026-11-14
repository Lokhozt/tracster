"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, Switch } from "@/components/ui";
import { getAppName } from "@/lib/app-name";

export function AdminPrivilegesToggle({
  enabled,
  variant = "card",
}: {
  enabled: boolean;
  /** "row": compact settings row with a switch (account page). */
  variant?: "card" | "row";
}) {
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

  if (variant === "row") {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium">{t("adminPrivilegesLabel")}</p>
          <p className="text-xs text-stone-500">
            {on ? t("adminPrivilegesOn") : t("adminPrivilegesOff")}
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <Switch
          checked={on}
          onChange={(next) => void toggle(next)}
          label={t("adminPrivilegesLabel")}
          disabled={saving}
        />
      </div>
    );
  }

  return (
    <Card className="max-w-xl">
      <h2 className="mb-2 text-lg font-semibold">{t("adminPrivileges")}</h2>
      <p className="mb-4 text-sm text-stone-600">{t("adminPrivilegesHelp", { appName: getAppName() })}</p>
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
