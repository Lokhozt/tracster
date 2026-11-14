"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui";
import { SEASON_PREVIEW_COOKIE, type SeasonPreview } from "@/lib/season-preview";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Admins only: preview a seasonal theme (autumn, christmas, none) on their own interface,
 * whatever the date. Stored in a cookie on this browser; members are never affected.
 */
export function SeasonPreviewSetting({ initial }: { initial: SeasonPreview }) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function choose(next: SeasonPreview) {
    setValue(next);
    document.cookie = `${SEASON_PREVIEW_COOKIE}=${next}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="space-y-2 px-4 py-3">
      <div>
        <p className="font-medium">{t("seasonPreviewTitle")}</p>
        <p className="text-xs text-stone-500">{t("seasonPreviewHint")}</p>
      </div>
      <SegmentedControl
        label={t("seasonPreviewTitle")}
        value={value}
        onChange={choose}
        options={[
          { value: "auto", label: t("seasonPreviewAuto") },
          { value: "autumn", label: t("seasonPreviewAutumn") },
          { value: "christmas", label: t("seasonPreviewChristmas") },
          { value: "none", label: t("seasonPreviewNone") },
        ]}
      />
    </div>
  );
}
