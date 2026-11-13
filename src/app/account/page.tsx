import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { AccountProfileForm } from "@/components/AccountProfileForm";
import { AdminPrivilegesToggle } from "@/components/AdminPrivilegesToggle";
import { CompetitorStatusToggle } from "@/components/CompetitorStatusToggle";
import { GoogleCalendarConnectionCard } from "@/components/GoogleCalendarConnectionCard";
import { LogoutButton } from "@/components/LogoutButton";
import { FooterContent } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isSeasonalStyleDisabledByEnv } from "@/lib/festive-season";
import { prisma } from "@/lib/db";
import { canHoldAdminPrivileges, hasAdminPrivileges } from "@/lib/privileges";
import { THEME_COOKIE, parseThemePreference } from "@/lib/theme";
import {
  associationCalendarFollowUrl,
  connectionIdFor,
  isGoogleCalendarConfigured,
  serializeGoogleConnection,
} from "@/lib/google-calendar";

type PageProps = {
  searchParams: Promise<{ googleCalendar?: string }>;
};

export default async function AccountPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [connection, query, locale, t, cookieStore, tComponents, tNavigation] = await Promise.all([
    prisma.googleCalendarConnection.findUnique({
      where: { id: connectionIdFor("USER", user.id) },
    }),
    searchParams,
    getLocale(),
    getTranslations("Account"),
    cookies(),
    getTranslations("Components"),
    getTranslations("Navigation"),
  ]);
  const themePreference = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <AppShell title={t("title")}>
      <p className="mb-6 hidden text-stone-600 sm:block">
        {t("intro")}
      </p>
      <div className="space-y-8">
        {/* Quick actions (formerly the header account menu): theme, admin pages, sign out. */}
        <div className="max-w-xl divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="font-medium">{tComponents("themeTitle")}</span>
            <ThemeToggle initialPreference={themePreference} />
          </div>
          {hasAdminPrivileges(user) && (
            <>
              <AccountLink href="/scheduling">{tNavigation("scheduling")}</AccountLink>
              <AccountLink href="/settings">{tNavigation("settings")}</AccountLink>
            </>
          )}
          <div className="px-4 py-3">
            <LogoutButton />
          </div>
        </div>
        <AccountProfileForm
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            displayLanguage: locale === "en" ? "english" : "french",
            disableSeasonalStyle: user.disableSeasonalStyle,
          }}
          seasonalStyleLockedByEnv={isSeasonalStyleDisabledByEnv()}
        />
        <CompetitorStatusToggle userId={user.id} isCompetitor={user.isCompetitor} forSelf />
        {canHoldAdminPrivileges(user.role) && (
          <AdminPrivilegesToggle enabled={user.adminPrivilegesEnabled} />
        )}
        <GoogleCalendarConnectionCard
          kind="user"
          connection={serializeGoogleConnection(connection)}
          configured={isGoogleCalendarConfigured()}
          result={query.googleCalendar}
          followUrl={associationCalendarFollowUrl()}
        />
        {/* Desktop shows these in the sidebar. */}
        <FooterContent className="lg:hidden" />
      </div>
    </AppShell>
  );
}

function AccountLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 font-medium transition hover:bg-stone-100"
    >
      {children}
      <span aria-hidden="true" className="text-stone-400">›</span>
    </Link>
  );
}
