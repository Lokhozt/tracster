"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type FloatingAction = {
  href: string;
  label: string;
};

/** Style of an entry in the "+" menu; shared with non-link entries passed as `extraItems`. */
export const FAB_MENU_ITEM_CLASS =
  "inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-900 shadow-lg ring-1 ring-stone-200";

const FAB_POSITION = "fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 lg:hidden";
const FAB_BUTTON =
  "inline-flex h-14 w-14 items-center justify-center rounded-full bg-stage text-[#fff] shadow-lg ring-2 ring-spotlight/60 transition active:scale-95";

/** Menu entries rise in one after another, starting next to the "+" (the last one). */
const MENU_ENTRY_MOTION =
  "transition-[opacity,translate] duration-(--duration-medium) ease-stage starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none";

function entryDelay(index: number, count: number): string {
  return `${(count - 1 - index) * 35}ms`;
}

function subscribeNothing(): () => void {
  return () => {};
}

/**
 * Rendered into <body>: the page content (<main>) is transformed during tab swipe animations,
 * which would otherwise make this `fixed` button move with it.
 */
export function FloatingActionButton({
  actions,
  extraItems = [],
  primary,
}: {
  actions: FloatingAction[];
  /** Extra menu entries that are not links (e.g. a button running an action). */
  extraItems?: React.ReactNode[];
  /** A single action run in one tap (e.g. opening a create sheet), instead of a menu. */
  primary?: { label: string; onClick: () => void };
}) {
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return isClient
    ? createPortal(
        <FloatingActionButtonContent actions={actions} extraItems={extraItems} primary={primary} />,
        document.body,
      )
    : null;
}

/**
 * The "+" of one in-page section (`?section=<id>`, e.g. a settings category): sections all stay
 * mounted, so it only shows while its section is the one open. One action: a link (`href`) or
 * a callback (`onClick`, e.g. a create sheet).
 */
export function SectionFloatingAction({
  sectionId,
  label,
  href,
  onClick,
}: {
  sectionId: string;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const searchParams = useSearchParams();
  if (searchParams.get("section") !== sectionId) {
    return null;
  }
  return href ? (
    <FloatingActionButton actions={[{ href, label }]} />
  ) : (
    <FloatingActionButton actions={[]} primary={onClick ? { label, onClick } : undefined} />
  );
}

/**
 * Phone/tablet "+" button (below `lg`; desktops use the sidebar and page buttons) floating above the bottom tab bar. With one action it links straight to
 * it; with several it opens a small menu of labelled actions above the button.
 */
function FloatingActionButtonContent({
  actions,
  extraItems,
  primary,
}: {
  actions: FloatingAction[];
  extraItems: React.ReactNode[];
  primary?: { label: string; onClick: () => void };
}) {
  const t = useTranslations("Components");
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (primary && actions.length + extraItems.length === 0) {
    return (
      <button
        type="button"
        onClick={primary.onClick}
        aria-label={primary.label}
        title={primary.label}
        data-fab=""
        className={cn(FAB_POSITION, FAB_BUTTON)}
      >
        <PlusIcon />
      </button>
    );
  }

  if (actions.length + extraItems.length === 0) {
    return null;
  }

  if (actions.length === 1 && extraItems.length === 0) {
    const [action] = actions;
    return (
      <Link
        href={action.href}
        aria-label={action.label}
        title={action.label}
        data-fab=""
        className={cn(FAB_POSITION, FAB_BUTTON)}
      >
        <PlusIcon />
      </Link>
    );
  }

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/40 transition-opacity duration-(--duration-medium) ease-stage starting:opacity-0 motion-reduce:transition-none lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      {/* Toggle first in the DOM so Tab moves from it into the opened menu; reversed visually. */}
      <div data-fab="" className={cn(FAB_POSITION, "flex flex-col-reverse items-end gap-3")}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? t("close") : t("createActions")}
          onClick={() => setOpen((value) => !value)}
          className={FAB_BUTTON}
        >
          <PlusIcon rotated={open} />
        </button>
        {open && (
          <ul
            id={menuId}
            className="flex flex-col items-end gap-2"
            // Entries marked data-fab-close (e.g. opening a sheet) close the menu when picked.
            onClick={(event) => {
              if ((event.target as Element).closest("[data-fab-close]")) {
                setOpen(false);
              }
            }}
          >
            {actions.map((action, index) => (
              <li
                key={action.href}
                className={MENU_ENTRY_MOTION}
                style={{ transitionDelay: entryDelay(index, actions.length + extraItems.length) }}
              >
                <Link
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className={FAB_MENU_ITEM_CLASS}
                >
                  {action.label}
                </Link>
              </li>
            ))}
            {extraItems.map((item, index) => (
              <li
                key={`extra-${index}`}
                className={MENU_ENTRY_MOTION}
                style={{
                  transitionDelay: entryDelay(actions.length + index, actions.length + extraItems.length),
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function PlusIcon({ rotated = false }: { rotated?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-6 w-6 transition-transform motion-reduce:transition-none", rotated && "rotate-45")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
