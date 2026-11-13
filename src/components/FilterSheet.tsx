"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

const SWIPE_DOWN_CLOSE_DISTANCE_PX = 80;

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
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) {
      return;
    }
    // A modal <dialog> does not stop the page behind it from scrolling.
    const rootStyle = document.documentElement.style;
    rootStyle.overflow = "hidden";
    return () => {
      rootStyle.overflow = "";
    };
  }, [open]);

  function onTouchEnd(event: React.TouchEvent) {
    const startY = swipeStartY.current;
    swipeStartY.current = null;
    if (startY !== null && event.changedTouches[0].clientY - startY >= SWIPE_DOWN_CLOSE_DISTANCE_PX) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Clicks on the ::backdrop target the <dialog> element itself.
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className={cn(
        "m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/40",
        "md:m-auto md:max-w-lg md:rounded-2xl",
      )}
    >
      <div className="flex max-h-[85dvh] flex-col pb-[env(safe-area-inset-bottom)]">
        <div
          className="shrink-0 px-5 pt-2 pb-3"
          onTouchStart={(event) => {
            swipeStartY.current = event.touches[0].clientY;
          }}
          onTouchEnd={onTouchEnd}
        >
          <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300 md:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
              {summary && <p className="mt-0.5 text-sm text-stone-500">{summary}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              {t("done")}
            </button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain border-t border-stone-100 px-5 pt-4 pb-6">
          {children}
        </div>
      </div>
    </dialog>
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
