"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";

function PenIcon({ className }: { className?: string }) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function EditIconLink({
  href,
  label,
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("Components");
  const accessibleLabel = label ?? t("edit");
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
      <PenIcon />
    </Link>
  );
}
