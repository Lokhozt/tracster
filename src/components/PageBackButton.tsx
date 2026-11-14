"use client";

import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppNavigation } from "@/lib/app-navigation";

/** Pages reached from the navigation itself: no back arrow there. */
const TOP_LEVEL_PATHS = new Set([
  "/",
  "/choreographies",
  "/documents",
  "/unavailability",
  "/scheduling",
  "/settings",
  "/account",
  "/login",
  "/register",
  "/reset-password",
  "/privacy",
  "/terms",
]);

/** In-page drill-down params (e.g. a choreography's `?section=`): back closes them first. */
const DRILL_DOWN_PARAMS = ["section"];

/** Event pages belong to the planning (see MainNav). */
const PLANNING_PREFIXES = ["/events", "/representations", "/rehearsals", "/repetitions"];

/** Where "back" goes when there is no previous app page (direct link, new tab). */
function parentHref(pathname: string, search: URLSearchParams): string {
  for (const param of DRILL_DOWN_PARAMS) {
    if (search.has(param)) {
      return pathname;
    }
  }
  const segments = pathname.split("/").filter(Boolean);
  segments.pop();
  // "/choreographies/x/rehearsals/statistics" → the choreography, not a missing list page.
  if (segments.at(-1) === "rehearsals" && segments.length > 1) {
    segments.pop();
  }
  const parent = `/${segments.join("/")}`;
  if (PLANNING_PREFIXES.includes(parent)) {
    return "/";
  }
  if (parent === "/users") {
    return "/settings?section=members";
  }
  return parent;
}

/**
 * "←" before the page title on detail pages (event, choreography, user…): goes back to the
 * previous app page, or up to the parent page. Also on phones: an installed app (standalone)
 * has no browser back button.
 */
export function PageBackButton() {
  const t = useTranslations("Components");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigation = useAppNavigation();
  // Top-level pages have their sections side by side on desktop (e.g. Paramètres): no arrow.
  if (TOP_LEVEL_PATHS.has(pathname)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigation.back(parentHref(pathname, new URLSearchParams(searchParams)))}
      aria-label={t("back")}
      title={t("back")}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
    </button>
  );
}
