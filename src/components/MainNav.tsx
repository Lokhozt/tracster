"use client";

export type NavItem = {
  href: string;
  label:
    | "schedule"
    | "choreographies"
    | "documents"
    | "unavailability"
    | "scheduling"
    | "settings"
    | "account";
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
