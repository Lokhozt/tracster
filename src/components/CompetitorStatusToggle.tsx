"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, Switch } from "@/components/ui";

export function CompetitorStatusToggle({
  userId,
  isCompetitor,
  variant = "card",
  forSelf = false,
}: {
  userId: string;
  isCompetitor: boolean;
  /** "row": compact settings row with a switch (account page). */
  variant?: "card" | "plain" | "row";
  forSelf?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("Components");
  const [on, setOn] = useState(isCompetitor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/users/${userId}/competitor`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompetitor: next }),
    });
    const data = (await response.json()) as {
      error?: string;
      isCompetitor?: boolean;
    };
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? t("competitorStatusError"));
      return;
    }

    setOn(data.isCompetitor ?? next);
    router.refresh();
  }

  if (variant === "row") {
    const label = forSelf ? t("competitorStatusLabelSelf") : t("competitorStatusLabel");
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-stone-500">
            {on ? t("competitorStatusOn") : t("competitorStatusOff")}
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <Switch checked={on} onChange={(next) => void toggle(next)} label={label} disabled={saving} />
      </div>
    );
  }

  const body = (
    <>
      {variant === "card" && (
        <h2 className="mb-2 text-lg font-semibold">{t("competitorStatus")}</h2>
      )}
      <p className="mb-4 text-sm text-stone-600">
        {forSelf ? t("competitorStatusHelpSelf") : t("competitorStatusHelp")}
      </p>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={on}
          disabled={saving}
          onChange={(event) => void toggle(event.target.checked)}
          className="mt-0.5 rounded border-stone-300"
        />
        <span>
          <span className="font-medium">
            {forSelf ? t("competitorStatusLabelSelf") : t("competitorStatusLabel")}
          </span>
          <span className="mt-0.5 block text-stone-500">
            {on ? t("competitorStatusOn") : t("competitorStatusOff")}
          </span>
        </span>
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </>
  );

  if (variant === "plain") {
    return body;
  }

  return <Card className="max-w-xl">{body}</Card>;
}
