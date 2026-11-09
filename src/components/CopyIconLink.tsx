"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";

function CopyIcon({ className }: { className?: string }) {
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
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function CopyIconLink({
  href,
  label,
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("Components");
  const accessibleLabel = label ?? t("copyEvent");
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
      <CopyIcon />
    </Link>
  );
}
