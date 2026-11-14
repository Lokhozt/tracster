"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { replaceUrlInPlace } from "@/lib/app-navigation";

const CREATE_PARAM = "create";
const HISTORY_KEY = "createSheet";

function urlWithCreate(kind: string | null): string {
  const url = new URL(window.location.href);
  if (kind) {
    url.searchParams.set(CREATE_PARAM, kind);
  } else {
    url.searchParams.delete(CREATE_PARAM);
  }
  return url.pathname + url.search;
}

/**
 * Opens the create sheet `kind` of the current page (`?create=<kind>`) as a history step, so
 * the phone's back button closes it. Works from anywhere, e.g. the floating "+" menu.
 */
export function openCreateSheet(kind: string): void {
  window.history.pushState({ [HISTORY_KEY]: kind }, "", urlWithCreate(kind));
}

/**
 * State of a page's create sheet: `open` follows `?create=<kind>`; `close()` goes back when the
 * sheet was opened in this tab (so "forward" does not reopen a stale entry), else drops the param.
 */
export function useCreateSheet(kind: string): {
  open: boolean;
  show: () => void;
  close: () => void;
} {
  const searchParams = useSearchParams();
  const open = searchParams.get(CREATE_PARAM) === kind;
  const show = useCallback(() => openCreateSheet(kind), [kind]);
  const close = useCallback(() => {
    if (new URL(window.location.href).searchParams.get(CREATE_PARAM) !== kind) {
      return;
    }
    const state: unknown = window.history.state;
    if (state && typeof state === "object" && (state as Record<string, unknown>)[HISTORY_KEY] === kind) {
      window.history.back();
    } else {
      replaceUrlInPlace(urlWithCreate(null));
    }
  }, [kind]);
  return { open, show, close };
}
