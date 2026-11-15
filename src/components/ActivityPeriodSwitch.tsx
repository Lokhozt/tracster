"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { SegmentedControl } from "@/components/ui";
import type { ActivityPeriod } from "@/lib/my-activity";

/** "Cette saison / Tout": kept in the URL so the page stays server rendered and shareable. */
export function ActivityPeriodSwitch({ period }: { period: ActivityPeriod }) {
  const t = useTranslations("Pages.Activity");
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  return (
    <SegmentedControl
      label={t("periodLabel")}
      value={period}
      options={[
        { value: "season", label: t("periodSeason") },
        { value: "all", label: t("periodAll") },
      ]}
      onChange={(value) =>
        startTransition(() =>
          router.replace(value === "all" ? `${pathname}?period=all` : pathname, { scroll: false }),
        )
      }
      className="w-full sm:w-72"
    />
  );
}
