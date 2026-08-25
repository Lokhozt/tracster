"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

const baseNavItems: NavItem[] = [
  {
    href: "/",
    label: "Schedule",
    match: (pathname) => pathname === "/",
  },
  {
    href: "/choreographies",
    label: "Choreographies",
    match: (pathname) => pathname.startsWith("/choreographies"),
  },
  {
    href: "/representations",
    label: "Representations",
    match: (pathname) => pathname.startsWith("/representations"),
  },
  {
    href: "/events",
    label: "Events",
    match: (pathname) => pathname.startsWith("/events"),
  },
  {
    href: "/unavailability",
    label: "Unavailability",
    match: (pathname) => pathname.startsWith("/unavailability"),
  },
];

const usersNavItem: NavItem = {
  href: "/users",
  label: "Users",
  match: (pathname) => pathname.startsWith("/users"),
};

const settingsNavItem: NavItem = {
  href: "/settings",
  label: "Settings",
  match: (pathname) => pathname.startsWith("/settings"),
};

export function getNavItems(showAdminNav = false): NavItem[] {
  return showAdminNav ? [...baseNavItems, usersNavItem, settingsNavItem] : baseNavItems;
}

export function MainNav({ showUsersNav = false }: { showUsersNav?: boolean }) {
  const pathname = usePathname();
  const navItems = getNavItems(showUsersNav);

  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {navItems.map((item) => {
        const isActive = item.match(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition",
              isActive
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
