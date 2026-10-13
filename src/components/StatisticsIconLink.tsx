"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 16v-5" />
      <path d="M12 16V8" />
      <path d="M17 16v-9" />
    </svg>
  );
}

export function StatisticsIconLink({
  href,
  label,
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("Components");
  const accessibleLabel = label ?? t("rehearsalStatistics");
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900",
        className,
      )}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      <ChartBarIcon />
    </Link>
  );
}
