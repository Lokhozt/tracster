import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Suspense, ViewTransition } from "react";
import { getCurrentUser } from "@/lib/auth";
import { NavigationTracker } from "@/lib/app-navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { AutumnAccent } from "@/components/AutumnAccent";
import { BottomTabBar } from "@/components/BottomTabBar";
import { ChristmasLights } from "@/components/ChristmasLights";
import { HeaderBar } from "@/components/HeaderBar";
import { PageBackButton } from "@/components/PageBackButton";
import { SiteFooter } from "@/components/SiteFooter";
import { getSeasonalTheme } from "@/lib/festive-season";
import { MessageOfTheDayBanner } from "@/components/MessageOfTheDayBanner";
import { getMessageOfTheDay } from "@/lib/motd";
import { getAppLogoSrc } from "@/lib/s3";
import { canCreateEvent } from "@/lib/site-settings";
import { SIDEBAR_COOKIE, parseSidebarCollapsed } from "@/lib/sidebar";
import { THEME_COOKIE, parseThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Everything around the page content: background, desktop sidebar, phone header, bottom tab
 * bar. Rendered once by the root layout, so it stays mounted across navigations (no logo
 * flicker, smooth tab swipes); only the page's `AppShell` content changes.
 */
export async function AppFrame({ children }: { children: React.ReactNode }) {
  const [user, cookieStore, tSkip] = await Promise.all([
    getCurrentUser(),
    cookies(),
    getTranslations("Components"),
  ]);
  const themePreference = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);
  const sidebarCollapsed = parseSidebarCollapsed(cookieStore.get(SIDEBAR_COOKIE)?.value);
  const seasonalTheme = getSeasonalTheme(new Date(), {
    userDisableSeasonalStyle: user?.disableSeasonalStyle,
  });
  const logoSrc = getAppLogoSrc();
  const userCanCreateEvent = user ? await canCreateEvent(user.id) : false;

  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col text-stone-900",
        seasonalTheme === "christmas" && "festive-surface",
        seasonalTheme === "autumn" && "autumn-surface",
        !seasonalTheme && "bg-stone-50",
        // Room for the desktop sidebar (widths in globals.css, `.app-frame`).
        user && "app-frame",
      )}
    >
      {/* Keyboard users skip the navigation (visible only when focused). */}
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {tSkip("skipToContent")}
      </a>
      {user && (
        <AppSidebar
          user={{
            name: user.name,
            role: user.role,
            adminPrivilegesEnabled: user.adminPrivilegesEnabled,
          }}
          logoSrc={logoSrc}
          seasonalTheme={seasonalTheme}
          themePreference={themePreference}
          canCreateEvent={userCanCreateEvent}
          initialCollapsed={sidebarCollapsed}
        />
      )}
      {/* Signed-in desktops navigate with the sidebar; the header is for phones, tablets and visitors. */}
      <div
        className={cn("sticky top-0 z-40", user && "lg:hidden")}
        // Stays put above the sliding pages during tab transitions.
        style={{ viewTransitionName: "app-header" }}
      >
        <HeaderBar
          seasonalTheme={seasonalTheme}
          user={
            user
              ? {
                  name: user.name,
                  role: user.role,
                  adminPrivilegesEnabled: user.adminPrivilegesEnabled,
                }
              : null
          }
          logoSrc={logoSrc}
        />
        {seasonalTheme === "christmas" && <ChristmasLights />}
        {seasonalTheme === "autumn" && <AutumnAccent />}
      </div>
      {children}
      {/* Signed-in users find the legal links in the sidebar (desktop) or on the Compte page. */}
      {!user && <SiteFooter className="hidden sm:block" />}
      {user && <BottomTabBar seasonalTheme={seasonalTheme} />}
      <Suspense fallback={null}>
        <NavigationTracker />
      </Suspense>
    </div>
  );
}

/** A page's content area: optional title, message of the day, then the page itself. */
export async function AppShell({
  children,
  title,
  wide = false,
  narrow = false,
  fillHeight = false,
  titleActions,
}: {
  children: React.ReactNode;
  title?: React.ReactNode;
  /** Buttons on the title row, kept outside the <h1> so they don't become part of its name. */
  titleActions?: React.ReactNode;
  wide?: boolean;
  /** Detail pages (an event…): a readable width on large screens instead of the full width. */
  narrow?: boolean;
  /** Wide screens (xl+): exactly the window height, no page scroll (the content scrolls inside). */
  fillHeight?: boolean;
}) {
  const user = await getCurrentUser();
  const messageOfTheDay = getMessageOfTheDay();

  return (
    // Only tab changes animate (bottom bar tap or swipe, tagged in BottomTabBar); other
    // navigations swap instantly. Animations are defined in globals.css.
    <ViewTransition enter={TAB_TRANSITIONS} exit={TAB_TRANSITIONS} default="none">
      <main
        id="main"
        className={cn(
          "mx-auto w-full flex-1 px-4 pt-6 sm:px-6 sm:pt-8",
          // Leave room for the fixed bottom tab bar (phones/tablets) or the visitors' fixed footer.
          user
            ? "pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-10 lg:pb-12"
            : "pb-6 sm:pb-[calc(5rem+env(safe-area-inset-bottom))]",
          wide
            ? "max-w-screen-2xl"
            : narrow
              ? "max-w-5xl"
              : user
                ? "max-w-5xl xl:max-w-6xl 2xl:max-w-[100rem]"
                : "max-w-5xl",
          // flex-none: as a flex item, flex-1 would win over the fixed height.
          fillHeight && "xl:flex xl:h-dvh xl:flex-none xl:flex-col xl:overflow-hidden xl:pt-6 xl:pb-6",
        )}
      >
        {messageOfTheDay && <MessageOfTheDayBanner message={messageOfTheDay} />}
        {title && (
          <div className="mb-6 flex items-center gap-3">
            {user && (
              <Suspense fallback={null}>
                <PageBackButton />
              </Suspense>
            )}
            <h1 className="flex min-w-0 flex-1 items-center gap-2 font-display text-3xl break-words sm:text-4xl">
              {title}
            </h1>
            {titleActions}
          </div>
        )}
        {children}
      </main>
    </ViewTransition>
  );
}

const TAB_TRANSITIONS = { "tab-forward": "tab-forward", "tab-back": "tab-back", default: "none" };
