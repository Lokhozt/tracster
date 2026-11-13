"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { type NavItem, accountNavItem, getNavItems } from "@/components/MainNav";
import { type NavIconName, NavIcon } from "@/components/NavIcon";
import { FooterContent } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RoleBadge } from "@/components/UserForms";
import type { UserRole } from "@/generated/prisma/client";
import { getAppName } from "@/lib/app-name";
import type { SeasonalTheme } from "@/lib/festive-season";
import { hasAdminPrivileges } from "@/lib/privileges";
import { applySidebarCollapsed } from "@/lib/sidebar";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

type SidebarUser = {
  name: string;
  role: UserRole;
  adminPrivilegesEnabled: boolean;
};

const ADMIN_LABELS: ReadonlySet<NavItem["label"]> = new Set(["scheduling", "settings"]);

// Widths and label visibility live in globals.css (`.app-sidebar`, `.sidebar-label`): an icon
// rail between lg and xl or when collapsed (names in tooltips), full width otherwise.
const LABEL = "sidebar-label truncate";

/** Desktop navigation (lg and up). Phones and tablets use the header + bottom tab bar instead. */
export function AppSidebar({
  user,
  logoSrc,
  seasonalTheme = null,
  themePreference,
  canCreateEvent,
  initialCollapsed,
}: {
  user: SidebarUser;
  logoSrc: string | null;
  seasonalTheme?: SeasonalTheme | null;
  themePreference: ThemePreference;
  canCreateEvent: boolean;
  initialCollapsed: boolean;
}) {
  const t = useTranslations("Navigation");
  const tComponents = useTranslations("Components");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const showAdmin = hasAdminPrivileges(user);
  const items = getNavItems(showAdmin);
  const mainItems = items.filter((item) => !ADMIN_LABELS.has(item.label));
  const adminItems = items.filter((item) => ADMIN_LABELS.has(item.label));

  return (
    <aside
      className={cn(
        "app-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r lg:flex",
        "transition-[width,box-shadow] duration-200",
        seasonalTheme === "christmas" && "festive-header border-red-200/80",
        seasonalTheme === "autumn" && "autumn-header border-amber-300/80",
        !seasonalTheme && "border-stone-200 bg-white",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-3 py-4">
        {/* Brand + collapse toggle on one fixed-height row: collapsed, the toggle takes the logo's
            place, so nothing below moves. */}
        <div className="mb-4 flex h-11 items-center justify-between gap-2">
          <SidebarBrand logoSrc={logoSrc} />
          <button
            type="button"
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              applySidebarCollapsed(next);
            }}
            aria-pressed={collapsed}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-900 xl:flex"
          >
            <svg
              viewBox="0 0 24 24"
              className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16M16 10l-2 2 2 2" />
            </svg>
          </button>
        </div>

        {canCreateEvent && (
          <Link
            href="/events/new"
            title={tComponents("newEvent")}
            className="mb-3 flex min-h-11 items-center gap-3 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-stone-700"
          >
            <NavIcon label="add" className="h-5 w-5 shrink-0" />
            <span className={LABEL}>{tComponents("newEvent")}</span>
          </Link>
        )}

        <nav aria-label={t("mainNavLabel")} className="flex flex-col gap-1">
          {mainItems.map((item) => (
            <SidebarLink key={item.href} item={item} label={t(item.label)} pathname={pathname} />
          ))}
        </nav>

        {adminItems.length > 0 && (
          <nav aria-label={t("administration")} className="mt-5 flex flex-col gap-1">
            <p
              className="sidebar-heading px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-500"
            >
              {t("administration")}
            </p>
            {adminItems.map((item) => (
              <SidebarLink key={item.href} item={item} label={t(item.label)} pathname={pathname} />
            ))}
          </nav>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <div className="sidebar-label px-1">
            <ThemeToggle initialPreference={themePreference} />
          </div>
          <Link
            href={accountNavItem.href}
            aria-current={accountNavItem.match(pathname) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 transition",
              accountNavItem.match(pathname) ? "bg-stone-900/10" : "hover:bg-stone-900/5",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white">
              <NavIcon label="account" className="h-5 w-5" />
            </span>
            <span className="sidebar-label flex min-w-0 flex-col items-start gap-0.5">
              <span className="max-w-full truncate text-sm font-medium text-stone-900">{user.name}</span>
              {showAdmin && <RoleBadge role={user.role} />}
            </span>
          </Link>
          <FooterContent className="sidebar-label px-2 text-xs" />
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ item, label, pathname }: { item: NavItem; label: string; pathname: string }) {
  const isActive = item.match(pathname);
  return (
    <Link
      href={item.href}
      title={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
        isActive ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-900/5 hover:text-stone-900",
      )}
    >
      <NavIcon label={item.label as NavIconName} className="h-5 w-5 shrink-0" />
      <span className={LABEL}>{label}</span>
    </Link>
  );
}

function SidebarBrand({ logoSrc }: { logoSrc: string | null }) {
  const [showLogo, setShowLogo] = useState(Boolean(logoSrc));
  const appName = getAppName();
  return (
    <Link href="/" className="sidebar-brand flex min-h-11 min-w-0 items-center gap-3 px-2 font-semibold tracking-tight">
      {showLogo && logoSrc ? (
        // S3-backed logo is already sized; skip Next image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoSrc} alt="" className="h-9 w-9 shrink-0 object-contain" onError={() => setShowLogo(false)} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/app-icon/192" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
      )}
      <span className={cn(LABEL, "text-base leading-tight")}>{appName}</span>
    </Link>
  );
}
