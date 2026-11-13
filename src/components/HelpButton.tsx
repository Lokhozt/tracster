"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { FilterSheet } from "@/components/FilterSheet";
import { cn } from "@/lib/utils";

/** Round "?" button that opens page instructions in a bottom sheet (dialog on larger screens). */
export function HelpButton({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("Components");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t("helpFor", { title })}
        title={t("help")}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-base font-semibold text-stone-700 hover:bg-stone-100",
          className,
        )}
      >
        ?
      </button>
      <FilterSheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-3 text-sm leading-relaxed text-stone-700">{children}</div>
      </FilterSheet>
    </>
  );
}
