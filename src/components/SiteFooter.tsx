"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { getAppName } from "@/lib/app-name";
import { cn } from "@/lib/utils";

export function FooterContent({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Footer");

  return (
    <div className={cn("flex flex-col gap-3 text-sm text-stone-500", className)}>
      <p>{getAppName()}</p>
      <nav aria-label={t("navLabel")} className="flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/privacy" onClick={onNavigate} className="hover:text-stone-900">
          {t("privacy")}
        </Link>
        <Link href="/terms" onClick={onNavigate} className="hover:text-stone-900">
          {t("terms")}
        </Link>
      </nav>
    </div>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur",
        className,
      )}
    >
      <FooterContent className="mx-auto max-w-5xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" />
    </footer>
  );
}
