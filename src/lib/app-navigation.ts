"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

/**
 * In-app navigation history for this tab, so that "back" behaves like a native app:
 * - after creating or deleting, the form / deleted page is replaced instead of stacked;
 * - after saving, we go back to the page we came from (refreshed) instead of pushing it again;
 * - "back" links go back in history when the previous page is part of the app.
 *
 * The stack mirrors the browser history of the app's pages (paths with query string). It lives
 * in sessionStorage so it survives full reloads in the same tab, like the browser history does.
 */

const STACK_KEY = "tracster.navigationStack";
const REFRESH_ON_RETURN_KEY = "tracster.refreshOnReturn";
const MAX_STACK_LENGTH = 50;

// Set just before a navigation so the tracker knows how to update the stack when the URL changes.
let pendingPop = false;
let pendingReplace = false;

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    // Storage unavailable (private mode, blocked): navigation still works, just less smartly.
  }
}

function readStack(): string[] {
  try {
    const parsed: unknown = JSON.parse(readSession(STACK_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function currentPath(): string {
  return window.location.pathname + window.location.search;
}

/** Normalizes an href ("/documents?category=x", "?section=y") to an app path with query string. */
export function toAppPath(href: string): string {
  const url = new URL(href, window.location.href);
  return url.pathname + url.search;
}

/** The app page before the current one in this tab's history, or null if there is none. */
export function previousAppPath(): string | null {
  const stack = readStack();
  return stack.length >= 2 ? stack[stack.length - 2] : null;
}

/** Replace the current URL without a server round-trip (e.g. closing an in-page section). */
export function replaceUrlInPlace(href: string): void {
  if (toAppPath(href) !== currentPath()) {
    pendingReplace = true;
  }
  window.history.replaceState(null, "", href);
}

/** Keeps the stack in sync with the URL. Rendered once, in the app shell. */
export function NavigationTracker(): null {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();

  useEffect(() => {
    function onPopState() {
      pendingPop = true;
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const path = currentPath();
    const stack = readStack();
    let nextStack: string[];
    if (pendingPop) {
      // Back (or forward): drop everything after the page we returned to.
      const index = stack.lastIndexOf(path);
      nextStack = index >= 0 ? stack.slice(0, index + 1) : [...stack, path];
    } else if (pendingReplace) {
      nextStack = [...stack.slice(0, -1), path];
    } else {
      nextStack = stack[stack.length - 1] === path ? stack : [...stack, path];
    }
    pendingPop = false;
    pendingReplace = false;
    writeSession(STACK_KEY, JSON.stringify(nextStack.slice(-MAX_STACK_LENGTH)));

    // Back/forward reuses the cached page, so refresh it when we returned after a change.
    if (readSession(REFRESH_ON_RETURN_KEY) === path) {
      writeSession(REFRESH_ON_RETURN_KEY, null);
      router.refresh();
    }
  }, [pathname, search, router]);

  return null;
}

export type AppNavigation = {
  /**
   * Go to `href` without keeping the current page in history (after creating or deleting).
   * `transitionTypes` tag the navigation for <ViewTransition> animations (e.g. tab slides).
   */
  replace: (href: string, options?: { transitionTypes?: string[] }) => void;
  /** Return to `href`: go back if it is the previous page (and refresh it), else replace. */
  returnTo: (href: string) => void;
  /** Go back to the previous app page, or open `fallbackHref` when there is none. */
  back: (fallbackHref: string) => void;
};

export function useAppNavigation(): AppNavigation {
  const router = useRouter();

  return useMemo(() => {
    function replace(href: string, options?: { transitionTypes?: string[] }) {
      if (toAppPath(href) !== currentPath()) {
        pendingReplace = true;
      }
      router.replace(href, options?.transitionTypes ? { transitionTypes: options.transitionTypes } : undefined);
    }

    return {
      replace,
      returnTo(href: string) {
        const target = toAppPath(href);
        if (previousAppPath() === target) {
          writeSession(REFRESH_ON_RETURN_KEY, target);
          router.back();
        } else {
          replace(href);
        }
      },
      back(fallbackHref: string) {
        if (previousAppPath()) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      },
    };
  }, [router]);
}
