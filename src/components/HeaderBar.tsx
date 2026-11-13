"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { FooterContent } from "@/components/SiteFooter";
import type { UserRole } from "@/generated/prisma/client";
import { getAppName } from "@/lib/app-name";
import type { SeasonalTheme } from "@/lib/festive-season";
import { cn } from "@/lib/utils";

type HeaderUser = {
  name: string;
  role: UserRole;
  adminPrivilegesEnabled: boolean;
};

export function HeaderBar({
  user,
  logoSrc,
  seasonalTheme = null,
}: {
  user: HeaderUser | null;
  logoSrc?: string | null;
  seasonalTheme?: SeasonalTheme | null;
}) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  // Any navigation (menu link, bottom tab bar, swipe) closes the menu.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    // Lock the viewport scroller (<html>), not <body>: <html> has `overflow-x: clip`, so an
    // overflow on <body> would not propagate and would turn <body> into the sticky header's
    // scroll container, letting the header scroll away while the menu is open.
    const rootStyle = document.documentElement.style;
    rootStyle.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      rootStyle.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      {menuOpen && (
        // Dims the page behind the open menu; tapping it closes the menu.
        // Rendered outside <header>: its backdrop-filter would contain a fixed child.
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 bg-stone-900/40"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <header
        className={cn(
          "border-b pt-[env(safe-area-inset-top)] backdrop-blur",
          seasonalTheme === "christmas" && "festive-header border-red-200/80",
          seasonalTheme === "autumn" && "autumn-header border-amber-300/80",
          !seasonalTheme && "border-stone-200 bg-white/95",
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <BrandLink logoSrc={logoSrc} />

          {!user && (
            <div className="hidden sm:block">
              <AuthNav />
            </div>
          )}

          {/* Signed-in phones/tablets use the bottom tab bar (incl. Compte); this menu is for visitors. */}
          {!user && (
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 text-stone-800 sm:hidden"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MenuIcon open={menuOpen} />
            </button>
          )}
        </div>

        {menuOpen && !user && (
          <div
            id={menuId}
            className={cn(
              "max-h-[calc(100dvh-5rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain border-t px-4 py-4 sm:hidden",
              seasonalTheme === "christmas" && "festive-header border-red-200/60",
              seasonalTheme === "autumn" && "autumn-header border-amber-300/60",
              !seasonalTheme && "border-stone-200 bg-white",
            )}
          >
            <AuthNav stacked />
            <FooterContent
              className="mt-4 border-t border-stone-200 pt-4"
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        )}
      </header>
    </>
  );
}

function BrandLink({ logoSrc }: { logoSrc?: string | null }) {
  const [showLogo, setShowLogo] = useState(Boolean(logoSrc));
  const appName = getAppName();

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
      {appName}
    </Link>
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
