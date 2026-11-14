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
      <svg viewBox="0 0 24 24" className="h-[1.1em] w-[1.1em] text-amber-500" fill="currentColor" aria-hidden="true">
        <path d="M3 8.5l4.2 3.3L12 5l4.8 6.8L21 8.5l-1.8 9.5H4.8L3 8.5Z" />
        <rect x="4.8" y="19" width="14.4" height="2" rx="1" />
      </svg>
    </span>
  );
}
