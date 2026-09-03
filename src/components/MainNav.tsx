"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: "schedule" | "choreographies" | "events" | "unavailability" | "scheduling" | "settings";
  match: (pathname: string) => boolean;
};

const baseNavItems: NavItem[] = [
  {
    href: "/",
    label: "schedule",
    match: (pathname) => pathname === "/",
  },
  {
    href: "/choreographies",
    label: "choreographies",
    match: (pathname) => pathname.startsWith("/choreographies"),
  },
  {
    href: "/events",
    label: "events",
    match: (pathname) =>
      pathname.startsWith("/events") ||
      pathname.startsWith("/representations") ||
      pathname.startsWith("/rehearsals") ||
      pathname.startsWith("/repetitions"),
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

export function getNavItems(showAdminNav = false): NavItem[] {
  return showAdminNav ? [...baseNavItems, ...adminNavItems] : baseNavItems;
}

export function MainNav({ showAdminNav = false }: { showAdminNav?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
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
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );
}
