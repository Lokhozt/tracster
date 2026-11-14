"use client";

import { useTranslations } from "next-intl";
import { Sheet } from "@/components/Sheet";
import { cn } from "@/lib/utils";

/** Toolbar button that opens a `FilterSheet`; the badge counts active filters. */
export function FilterButton({
  activeFilterCount,
  onClick,
}: {
  activeFilterCount: number;
  onClick: () => void;
}) {
  const t = useTranslations("Components");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={t("filtersButtonLabel", { count: activeFilterCount })}
      title={t("filters")}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-lg border text-sm transition",
        // Icon only on phones (matches the calendar's small-screen toolbar), labelled from `md`.
        "min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:px-3 md:py-1.5",
        activeFilterCount > 0
          ? "border-stone-900 bg-stone-900 text-white hover:bg-stone-700"
          : "border-stone-300 bg-white text-stone-900 hover:bg-stone-100",
      )}
    >
      <FilterIcon />
      <span className="hidden md:inline">{t("filters")}</span>
      {activeFilterCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white ring-2 ring-white"
        >
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}

/**
 * Filters in a modal: a bottom sheet on phones, a centered dialog on larger screens.
 * Changes apply immediately; close by tapping outside, swiping the sheet down, Escape, or "Done".
 */
export function FilterSheet({
  open,
  onClose,
  title,
  summary,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Components");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      summary={summary}
      headerAction={
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          {t("done")}
        </button>
      }
    >
      {children}
    </Sheet>
  );
}

/** A checkbox row styled for use inside a `FilterSheet`. */
export function FilterCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-stone-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-stone-300"
      />
      {children}
    </label>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5h18l-7 8.5V19l-4 2v-7.5Z" />
    </svg>
  );
}
