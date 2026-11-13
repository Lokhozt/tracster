"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type FloatingAction = {
  href: string;
  label: string;
};

const FAB_POSITION = "fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 lg:hidden";
const FAB_BUTTON =
  "inline-flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-white shadow-lg transition active:scale-95";

function subscribeNothing(): () => void {
  return () => {};
}

/**
 * Rendered into <body>: the page content (<main>) is transformed during tab swipe animations,
 * which would otherwise make this `fixed` button move with it.
 */
export function FloatingActionButton({ actions }: { actions: FloatingAction[] }) {
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return isClient ? createPortal(<FloatingActionButtonContent actions={actions} />, document.body) : null;
}

/**
 * Phone/tablet "+" button (below `lg`; desktops use the sidebar and page buttons) floating above the bottom tab bar. With one action it links straight to
 * it; with several it opens a small menu of labelled actions above the button.
 */
function FloatingActionButtonContent({ actions }: { actions: FloatingAction[] }) {
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

  if (actions.length === 0) {
    return null;
  }

  if (actions.length === 1) {
    const [action] = actions;
    return (
      <Link
        href={action.href}
        aria-label={action.label}
        title={action.label}
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
          className="fixed inset-0 z-30 bg-stone-900/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div className={cn(FAB_POSITION, "flex flex-col items-end gap-3")}>
        {open && (
          <ul id={menuId} className="flex flex-col items-end gap-2">
            {actions.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-900 shadow-lg ring-1 ring-stone-200"
                >
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
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
      </div>
    </>
  );
}

function PlusIcon({ rotated = false }: { rotated?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-6 w-6 transition-transform", rotated && "rotate-45")}
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
