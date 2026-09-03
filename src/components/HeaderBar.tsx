"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { MainNav, type NavItem, getNavItems } from "@/components/MainNav";
import { RoleBadge } from "@/components/UserForms";
import type { UserRole } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

type HeaderUser = {
  name: string;
  role: UserRole;
};

export function HeaderBar({
  user,
  logoSrc,
}: {
  user: HeaderUser | null;
  logoSrc?: string | null;
}) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const showAdminNav = user?.role === "ADMIN" || user?.role === "OWNER";
  const navItems = user ? getNavItems(showAdminNav) : [];

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <BrandLink logoSrc={logoSrc} />

        {user ? (
          <div className="hidden min-w-0 items-center justify-between gap-4 lg:flex lg:flex-1">
            <MainNav showAdminNav={showAdminNav} />
            <UserCluster user={user} />
          </div>
        ) : (
          <div className="hidden sm:block">
            <AuthNav />
          </div>
        )}

        <button
          type="button"
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 text-stone-800",
            user ? "lg:hidden" : "sm:hidden",
          )}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen && (
        <div
          id={menuId}
          className={cn(
            "border-t border-stone-200 bg-white px-4 py-4 sm:px-6",
            user ? "lg:hidden" : "sm:hidden",
          )}
        >
          {user ? (
            <div className="space-y-4">
              <UserCluster user={user} />
              <MobileNav
                items={navItems}
                pathname={pathname}
                onNavigate={() => setMenuOpen(false)}
              />
            </div>
          ) : (
            <AuthNav stacked />
          )}
        </div>
      )}
    </header>
  );
}

function BrandLink({ logoSrc }: { logoSrc?: string | null }) {
  const [showLogo, setShowLogo] = useState(Boolean(logoSrc));

  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"
    >
      {showLogo && logoSrc ? (
        // S3-backed logo is already sized for the header; skip Next image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt=""
          className="h-8 w-auto object-contain"
          onError={() => setShowLogo(false)}
        />
      ) : null}
      Tracster
    </Link>
  );
}

function UserCluster({ user }: { user: HeaderUser }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/account" className="truncate text-stone-600 hover:text-stone-900">
          {user.name}
        </Link>
        {(user.role === "ADMIN" || user.role === "OWNER") && (
          <RoleBadge role={user.role} />
        )}
      </div>
    </div>
  );
}

function MobileNav({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  const t = useTranslations("Navigation");
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = item.match(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-3 text-base font-medium transition",
              isActive
                ? "bg-stone-900 text-white"
                : "text-stone-700 hover:bg-stone-100 hover:text-stone-900",
            )}
          >
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}
