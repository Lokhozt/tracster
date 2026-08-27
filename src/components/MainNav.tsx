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
    href: "/events",
    label: "Events",
    match: (pathname) =>
      pathname.startsWith("/events") ||
      pathname.startsWith("/representations") ||
      pathname.startsWith("/repetitions"),
  },
  {
    href: "/unavailability",
    label: "Unavailability",
    match: (pathname) => pathname.startsWith("/unavailability"),
  },
];

const settingsNavItem: NavItem = {
  href: "/settings",
  label: "Settings",
  match: (pathname) =>
    pathname.startsWith("/settings") || pathname.startsWith("/users"),
};

export function getNavItems(showAdminNav = false): NavItem[] {
  return showAdminNav ? [...baseNavItems, settingsNavItem] : baseNavItems;
}

export function MainNav({ showAdminNav = false }: { showAdminNav?: boolean }) {
  const pathname = usePathname();
  const navItems = getNavItems(showAdminNav);

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
