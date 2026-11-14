"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

const SWIPE_DOWN_CLOSE_DISTANCE_PX = 80;
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

// Sheets can stack (a date picker over a form): the page stays locked until the last one closes.
let openSheetCount = 0;
function lockPageScroll(): () => void {
  openSheetCount += 1;
  document.documentElement.style.overflow = "hidden";
  return () => {
    openSheetCount -= 1;
    if (openSheetCount === 0) {
      document.documentElement.style.overflow = "";
    }
  };
}

/**
 * Modal panel: a bottom sheet on phones (swipe the handle down to close), a centered dialog from
 * `md`. Closes on Escape, a tap outside, or the header action. Base of `FilterSheet` and
 * `FormSheet`.
 */
export function Sheet({
  open,
  onClose,
  title,
  summary,
  headerAction,
  size = "default",
  className,
  bodyClassName,
  bodyPaddingBottom = true,
  confirmClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  summary?: string;
  headerAction: React.ReactNode;
  /** "form": taller on phones and wider on desktops. */
  size?: "default" | "form";
  className?: string;
  bodyClassName?: string;
  /** False when the content brings its own bottom spacing (e.g. a sticky save bar). */
  bodyPaddingBottom?: boolean;
  /** Asked before closing by Escape, back, a tap outside or a swipe; false keeps it open. */
  confirmClose?: () => boolean;
  children: React.ReactNode;
}) {
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
      // The sheet itself takes focus (not its first button, which would show a focus ring).
      dialog.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) {
      return;
    }
    // A modal <dialog> does not stop the page behind it from scrolling.
    return lockPageScroll();
  }, [open]);

  function requestClose() {
    if (!confirmClose || confirmClose()) {
      onClose();
    }
  }

  function onTouchEnd(event: React.TouchEvent) {
    const startY = swipeStartY.current;
    swipeStartY.current = null;
    if (startY !== null && event.changedTouches[0].clientY - startY >= SWIPE_DOWN_CLOSE_DISTANCE_PX) {
      requestClose();
    }
  }

  const maxHeight = size === "form" ? "max-h-[92dvh]" : "max-h-[85dvh]";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      tabIndex={-1}
      onCancel={(event) => {
        // Escape / the phone's back gesture: keep the sheet when the user wants to stay.
        if (event.target === event.currentTarget && confirmClose && !confirmClose()) {
          event.preventDefault();
        }
      }}
      onClose={(event) => {
        // React passes a nested sheet's "close" up the component tree: only react to our own.
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onClick={(event) => {
        // Clicks on the ::backdrop target the <dialog> element itself.
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-0 text-stone-900 shadow-xl outline-none backdrop:bg-black/50",
        // Opens and closes smoothly (closing is quicker); the dimmed backdrop fades with it.
        "transition-[translate,opacity,overlay,display] transition-discrete duration-(--duration-medium) ease-stage",
        "starting:translate-y-6 starting:opacity-0 not-open:translate-y-6 not-open:opacity-0 not-open:duration-(--duration-short)",
        "backdrop:transition-[opacity,overlay,display] backdrop:transition-discrete backdrop:duration-(--duration-medium)",
        "starting:backdrop:opacity-0 not-open:backdrop:opacity-0",
        "motion-reduce:transition-none motion-reduce:backdrop:transition-none",
        "md:m-auto md:rounded-2xl",
        size === "form" ? "md:max-w-xl" : "md:max-w-lg",
        maxHeight,
        className,
      )}
    >
      <div className={cn("flex flex-col pb-[env(safe-area-inset-bottom)]", maxHeight)}>
        <div
          className="shrink-0 px-5 pt-2 pb-3"
          onTouchStart={(event) => {
            swipeStartY.current = event.touches[0].clientY;
          }}
          onTouchEnd={onTouchEnd}
        >
          <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300 md:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {summary && <p className="mt-0.5 text-sm text-stone-500">{summary}</p>}
            </div>
            {headerAction}
          </div>
        </div>
        <div
          className={cn(
            "overflow-y-auto overscroll-contain border-t border-stone-100 px-5 pt-4",
            bodyPaddingBottom && "pb-6",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
}

/**
 * Every create (and edit) form opens in this: a tall bottom sheet on phones, a dialog on
 * desktops. The form's own `FormActions` (when last in the form) stick to the bottom so the
 * save button stays in reach while scrolling. Desktops focus the first field.
 */
export function FormSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Components");
  const bodyRef = useRef<HTMLDivElement>(null);
  // Something was typed or picked since the sheet opened: closing would lose it.
  const dirty = useRef(false);
  useEffect(() => {
    if (open) {
      dirty.current = false;
    }
  }, [open]);
  const confirmDiscard = () => !dirty.current || window.confirm(t("discardChanges"));

  useEffect(() => {
    if (!open || !window.matchMedia(DESKTOP_MEDIA_QUERY).matches) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      bodyRef.current
        ?.querySelector<HTMLElement>(
          "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])",
        )
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      confirmClose={confirmDiscard}
      title={title}
      size="form"
      bodyPaddingBottom={false}
      bodyClassName={cn(
        // Sticky save bar: the form's last FormActions.
        "[&_form>[data-form-actions]:last-child]:sticky [&_form>[data-form-actions]:last-child]:bottom-0",
        "[&_form>[data-form-actions]:last-child]:z-10 [&_form>[data-form-actions]:last-child]:-mx-5",
        "[&_form>[data-form-actions]:last-child]:mt-6 [&_form>[data-form-actions]:last-child]:border-t",
        "[&_form>[data-form-actions]:last-child]:border-stone-100 [&_form>[data-form-actions]:last-child]:bg-white",
        "[&_form>[data-form-actions]:last-child]:px-5 [&_form>[data-form-actions]:last-child]:py-3",
        // Side by side even on phones (Annuler, then the main button taking the rest): one row
        // instead of two keeps the sticky bar short.
        "[&_form>[data-form-actions]:last-child]:flex-row",
        "[&_form>[data-form-actions]:last-child>*]:w-auto",
        "[&_form>[data-form-actions]:last-child>*:last-child]:flex-1",
      )}
      headerAction={
        <button
          type="button"
          onClick={() => {
            if (confirmDiscard()) {
              onClose();
            }
          }}
          aria-label={t("close")}
          title={t("close")}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      }
    >
      {/* Bottom room for forms whose last element is not a sticky save bar. */}
      <div
        ref={bodyRef}
        className="pb-6 has-[form>[data-form-actions]:last-child]:pb-0"
        onInputCapture={() => {
          dirty.current = true;
        }}
      >
        {children}
      </div>
    </Sheet>
  );
}
