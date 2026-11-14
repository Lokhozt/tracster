"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { type NavItem, accountNavItem, getNavItems } from "@/components/MainNav";
import { NavIcon } from "@/components/NavIcon";
import type { SeasonalTheme } from "@/lib/festive-season";
import { cn } from "@/lib/utils";
import { useAppNavigation } from "@/lib/app-navigation";

type TabLabel = NavItem["label"];

/** Visual order of the bar; swiping follows the same order. Planning sits in the center. */
const TAB_ORDER: TabLabel[] = [
  "choreographies",
  "documents",
  "schedule",
  "unavailability",
  "account",
];

const SHORT_LABEL_KEYS: Partial<Record<TabLabel, "choreographiesShort" | "unavailabilityShort">> = {
  choreographies: "choreographiesShort",
  unavailability: "unavailabilityShort",
};

const CENTER_TAB: TabLabel = "schedule";
const MOBILE_MEDIA_QUERY = "(max-width: 1023px)";
const SWIPE_MIN_DISTANCE_PX = 60;
const SWIPE_FLICK_MAX_DURATION_MS = 300;
/** A slow drag commits once it covers this share of the screen width. */
const SWIPE_COMMIT_RATIO = 0.3;
const SWIPE_AXIS_LOCK_PX = 10;
const SWIPE_EDGE_GUARD_PX = 24;

const TAB_ITEMS: NavItem[] = TAB_ORDER.map((label) =>
  [...getNavItems(false), accountNavItem].find((item) => item.label === label),
).filter((item): item is NavItem => item !== undefined);


export function BottomTabBar({ seasonalTheme = null }: { seasonalTheme?: SeasonalTheme | null }) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const currentIndex = TAB_ITEMS.findIndex((item) => item.href === pathname);

  useSwipeTabNavigation(TAB_ITEMS, pathname);

  /** Direction tag for the pager slide when tapping another tab (see ViewTransition in AppShell). */
  function tabTransition(itemIndex: number): { transitionTypes?: string[]; onClick?: () => void } {
    if (currentIndex === -1 || itemIndex === currentIndex) {
      return {};
    }
    return {
      transitionTypes: [itemIndex > currentIndex ? "tab-forward" : "tab-back"],
      onClick: () => setSwipeOffset(0),
    };
  }

  return (
    <nav
      aria-label={t("mainNavLabel")}
      data-bottom-tab-bar=""
      // Stays put above the sliding pages during tab transitions.
      style={{ viewTransitionName: "app-tabbar" }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden",
        seasonalTheme === "christmas" && "festive-header border-red-200/80",
        seasonalTheme === "autumn" && "autumn-header border-amber-300/80",
        !seasonalTheme && "border-stone-200 bg-white/95",
      )}
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5 items-end">
        {TAB_ITEMS.map((item, itemIndex) => {
          const isActive = item.match(pathname);
          const shortLabelKey = SHORT_LABEL_KEYS[item.label];
          const label = t(shortLabelKey ?? item.label);

          if (item.label === CENTER_TAB) {
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  {...tabTransition(itemIndex)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={t(item.label)}
                  className="flex -translate-y-3 flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition active:scale-95",
                      isActive
                        ? "bg-stone-900 text-white"
                        : "border border-stone-300 bg-white text-stone-800",
                    )}
                  >
                    <NavIcon label={item.label} className="h-7 w-7" />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] leading-none max-[360px]:text-[10px]",
                      isActive ? "font-semibold text-stone-900" : "text-stone-600",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href} className="flex justify-center">
              <Link
                href={item.href}
                {...tabTransition(itemIndex)}
                aria-current={isActive ? "page" : undefined}
                aria-label={t(item.label)}
                className="flex h-16 w-full flex-col items-center justify-center gap-1 transition active:scale-95"
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition",
                    isActive ? "bg-stone-900/10 text-stone-900" : "text-stone-500",
                  )}
                >
                  <NavIcon label={item.label} className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    "max-w-full truncate px-0.5 text-[11px] leading-none max-[360px]:text-[10px]",
                    isActive ? "font-semibold text-stone-900" : "text-stone-600",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pageContent(): HTMLElement | null {
  return document.querySelector("main");
}

/** Where the finger released the page; the tab slide (globals.css) continues from there. */
function setSwipeOffset(offsetX: number): void {
  document.documentElement.style.setProperty("--tab-swipe-dx", `${offsetX}px`);
}

/**
 * Horizontal swipe on a top-level tab page moves to the neighbouring tab (mobile/tablet only).
 * The page follows the finger, then slides out (and the next tab slides in) or springs back.
 * Ignored when the gesture starts in a form field, the header, an element marked `data-no-swipe`,
 * or anything that scrolls horizontally (e.g. a wide calendar), and cancelled while an element
 * marked `data-swipe-lock` is on the page.
 */
function useSwipeTabNavigation(tabItems: NavItem[], pathname: string): void {
  const navigation = useAppNavigation();
  const router = useRouter();
  const currentIndex = tabItems.findIndex((item) => item.href === pathname);

  // Warm up the other tabs so a swipe or tap can show them without waiting.
  useEffect(() => {
    if (currentIndex === -1) {
      return;
    }
    for (const item of tabItems) {
      if (item.href !== pathname) {
        router.prefetch(item.href);
      }
    }
  }, [currentIndex, pathname, router, tabItems]);

  useEffect(() => {
    if (currentIndex === -1) {
      return;
    }

    let gesture: {
      startX: number;
      startY: number;
      startTime: number;
      axis: "undecided" | "horizontal" | "vertical";
    } | null = null;

    function setPageOffset(main: HTMLElement, offsetX: number, transition: string): void {
      main.style.transition = transition;
      main.style.transform = offsetX === 0 ? "" : `translateX(${offsetX}px)`;
    }

    function onTouchStart(event: TouchEvent): void {
      gesture = null;
      if (event.touches.length !== 1 || !window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
        return;
      }
      const touch = event.touches[0];
      const nearScreenEdge =
        touch.clientX < SWIPE_EDGE_GUARD_PX ||
        touch.clientX > window.innerWidth - SWIPE_EDGE_GUARD_PX;
      if (nearScreenEdge || isSwipeExcludedTarget(event.target)) {
        return;
      }
      gesture = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: event.timeStamp,
        axis: "undecided",
      };
    }

    function onTouchMove(event: TouchEvent): void {
      if (!gesture || gesture.axis === "vertical") {
        return;
      }
      // A widget is busy with this finger (e.g. drawing in a calendar).
      if (document.querySelector("[data-swipe-lock]")) {
        onTouchCancel();
        return;
      }
      const touch = event.touches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      if (gesture.axis === "undecided") {
        if (Math.abs(deltaX) < SWIPE_AXIS_LOCK_PX && Math.abs(deltaY) < SWIPE_AXIS_LOCK_PX) {
          return;
        }
        gesture.axis = Math.abs(deltaX) > 1.5 * Math.abs(deltaY) ? "horizontal" : "vertical";
        if (gesture.axis === "vertical" || hasTextSelection()) {
          gesture.axis = "vertical";
          return;
        }
      }
      const main = pageContent();
      if (!main || prefersReducedMotion()) {
        return;
      }
      // Resist when there is no tab on that side.
      const hasTarget = Boolean(tabItems[currentIndex + (deltaX < 0 ? 1 : -1)]);
      setPageOffset(main, hasTarget ? deltaX : deltaX * 0.25, "none");
    }

    function onTouchEnd(event: TouchEvent): void {
      if (!gesture || gesture.axis !== "horizontal") {
        gesture = null;
        return;
      }
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - gesture.startX;
      const duration = event.timeStamp - gesture.startTime;
      gesture = null;

      const main = pageContent();
      const isFlick = Math.abs(deltaX) >= SWIPE_MIN_DISTANCE_PX && duration <= SWIPE_FLICK_MAX_DURATION_MS;
      const isLongDrag = Math.abs(deltaX) >= window.innerWidth * SWIPE_COMMIT_RATIO;
      const target = tabItems[currentIndex + (deltaX < 0 ? 1 : -1)];

      if (!target || !(isFlick || isLongDrag)) {
        if (main) {
          setPageOffset(main, 0, "transform 200ms ease-out");
        }
        return;
      }
      // The page stays where the finger left it (no snap back); the view transition then slides
      // it out from that exact position while the next tab slides in beside it.
      setSwipeOffset(main && !prefersReducedMotion() ? deltaX : 0);
      navigation.replace(target.href, {
        transitionTypes: [deltaX < 0 ? "tab-forward" : "tab-back"],
      });
    }

    function onTouchCancel(): void {
      gesture = null;
      const main = pageContent();
      if (main) {
        setPageOffset(main, 0, "transform 200ms ease-out");
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [currentIndex, navigation, tabItems]);
}

function isSwipeExcludedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return true;
  }
  if (
    target.closest(
      "input, textarea, select, [contenteditable='true'], header, dialog, [data-no-swipe]",
    )
  ) {
    return true;
  }
  for (let element: Element | null = target; element && element !== document.body; element = element.parentElement) {
    const overflowX = window.getComputedStyle(element).overflowX;
    const scrollsHorizontally =
      (overflowX === "auto" || overflowX === "scroll") &&
      element.scrollWidth > element.clientWidth + 1;
    if (scrollsHorizontally) {
      return true;
    }
  }
  return false;
}

function hasTextSelection(): boolean {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed);
}
