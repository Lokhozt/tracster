"use client";

export type NavItem = {
  href: string;
  label:
    | "schedule"
    | "activity"
    | "choreographies"
    | "documents"
    | "unavailability"
    | "scheduling"
    | "settings"
    | "account"
    | "more";
  match: (pathname: string) => boolean;
};

const baseNavItems: NavItem[] = [
  {
    href: "/",
    label: "schedule",
    // Event pages belong to the planning since the events list was merged into it.
    match: (pathname) =>
      pathname === "/" ||
      pathname.startsWith("/events") ||
      pathname.startsWith("/representations") ||
      pathname.startsWith("/rehearsals") ||
      pathname.startsWith("/repetitions"),
  },
  {
    href: "/activity",
    label: "activity",
    match: (pathname) => pathname.startsWith("/activity"),
  },
  {
    href: "/choreographies",
    label: "choreographies",
    match: (pathname) => pathname.startsWith("/choreographies"),
  },
  {
    href: "/documents",
    label: "documents",
    match: (pathname) => pathname.startsWith("/documents"),
  },
  {
    href: "/unavailability",
    label: "unavailability",
    match: (pathname) => pathname.startsWith("/unavailability"),
  },
];

const adminNavItems: NavItem[] = [
  {
    href: "/scheduling",
    label: "scheduling",
    match: (pathname) => pathname.startsWith("/scheduling"),
  },
  {
    href: "/settings",
    label: "settings",
    match: (pathname) =>
      pathname.startsWith("/settings") || pathname.startsWith("/users"),
  },
];

/** Account page; also groups the admin pages in the mobile bottom tab bar. */
export const accountNavItem: NavItem = {
  href: "/account",
  label: "account",
  match: (pathname) =>
    pathname.startsWith("/account") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/scheduling"),
};

export function getNavItems(showAdminNav = false): NavItem[] {
  return showAdminNav ? [...baseNavItems, ...adminNavItems] : baseNavItems;
}

/**
 * "Plus" tab (phones): a menu of the pages without a tab of their own. It stays lit on them.
 * Desktop reaches those pages from the sidebar instead.
 */
export const MORE_MENU_PATHS = [
  "/account",
  "/calendar-feed",
  "/documents",
  "/settings",
  "/users",
  "/scheduling",
];

export const moreNavItem: NavItem = {
  href: "/more",
  label: "more",
  match: (pathname) =>
    pathname.startsWith("/more") || MORE_MENU_PATHS.some((path) => pathname.startsWith(path)),
};
