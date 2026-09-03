"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function ChoreographerBadge({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const t = useTranslations("Components");
  const accessibleLabel = label ?? t("youAreChoreographer");
  return (
    <span
      className={cn("inline-flex shrink-0 items-center leading-none", className)}
      title={accessibleLabel}
      aria-label={accessibleLabel}
      role="img"
    >
      👑
    </span>
  );
}
