"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { openChoreographySection } from "@/components/ChoreographyTabs";
import { cn } from "@/lib/utils";

const ICON_BUTTON =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-100 hover:text-stone-900";

/**
 * Title-row actions of a choreography: WhatsApp group, edit, and a "more" menu for admin actions.
 * Management lives here instead of in the section list, so the page leads with content.
 */
export function ChoreographyHeaderActions({
  whatsappUrl,
  canEdit,
  canManageLifecycle,
}: {
  whatsappUrl: string | null;
  canEdit: boolean;
  canManageLifecycle: boolean;
}) {
  const t = useTranslations("Pages.ChoreographyDetail");
  const tc = useTranslations("Components");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="flex shrink-0 items-center gap-2 text-base font-normal tracking-normal">
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("openWhatsapp")}
          title={t("openWhatsapp")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-[#fff] hover:bg-[#1DA851]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
            <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.83 9.83 0 0 1 9.88 9.89c0 5.45-4.43 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41Z" />
          </svg>
        </a>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => openChoreographySection("edit")}
          aria-label={t("editChoreography")}
          title={t("editChoreography")}
          className={ICON_BUTTON}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}
      {canManageLifecycle && (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={t("moreActions")}
            title={t("moreActions")}
            className={ICON_BUTTON}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="19" cy="12" r="1.75" />
            </svg>
          </button>
          {menuOpen && (
            <div
              id={menuId}
              className={cn(
                "absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 text-sm shadow-lg",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openChoreographySection("admin");
                }}
                className="block w-full px-4 py-2.5 text-left hover:bg-stone-100"
              >
                {tc("adminActions")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
