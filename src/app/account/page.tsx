import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { AccountIdentityCard } from "@/components/AccountIdentityCard";
import { AdminPrivilegesToggle } from "@/components/AdminPrivilegesToggle";
import { CompetitorStatusToggle } from "@/components/CompetitorStatusToggle";
import { GoogleCalendarConnectionCard } from "@/components/GoogleCalendarConnectionCard";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/auth";
import { isSeasonalStyleDisabledByEnv } from "@/lib/festive-season";
import { prisma } from "@/lib/db";
import { canHoldAdminPrivileges, hasAdminPrivileges } from "@/lib/privileges";
import { THEME_COOKIE, parseThemePreference } from "@/lib/theme";
import { SEASON_PREVIEW_COOKIE, parseSeasonPreview } from "@/lib/season-preview";
import { SeasonPreviewSetting } from "@/components/SeasonPreviewSetting";
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

  const [connection, query, locale, t, cookieStore, tComponents] = await Promise.all([
    prisma.googleCalendarConnection.findUnique({
      where: { id: connectionIdFor("USER", user.id) },
    }),
    searchParams,
    getLocale(),
    getTranslations("Account"),
    cookies(),
    getTranslations("Components"),
  ]);
  const themePreference = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <AppShell title={t("title")}>
      <div className="space-y-4">
        <AccountIdentityCard
          name={user.name}
          email={user.email}
          phone={user.phone}
          role={user.role}
          showRole={hasAdminPrivileges(user)}
          profile={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            displayLanguage: locale === "en" ? "english" : "french",
            disableSeasonalStyle: user.disableSeasonalStyle,
          }}
          seasonalStyleLockedByEnv={isSeasonalStyleDisabledByEnv()}
        />
        {/* Preferences as compact rows. */}
        <section className="max-w-xl">
          <h2 className="mb-2 px-1 text-xs font-semibold text-stone-500">{t("preferences")}</h2>
          <div className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium">{tComponents("themeTitle")}</span>
              <ThemeToggle initialPreference={themePreference} />
            </div>
            <CompetitorStatusToggle userId={user.id} isCompetitor={user.isCompetitor} forSelf variant="row" />
            {canHoldAdminPrivileges(user.role) && (
              <AdminPrivilegesToggle enabled={user.adminPrivilegesEnabled} variant="row" />
            )}
            {/* Admin only, this browser only: try a seasonal theme whatever the date. */}
            {hasAdminPrivileges(user) && (
              <SeasonPreviewSetting
                initial={parseSeasonPreview(cookieStore.get(SEASON_PREVIEW_COOKIE)?.value)}
              />
            )}
          </div>
        </section>
        {/* Members can't act on a missing server configuration; only admins need to see it. */}
        {(isGoogleCalendarConfigured() || canHoldAdminPrivileges(user.role)) && (
          <GoogleCalendarConnectionCard
            kind="user"
            connection={serializeGoogleConnection(connection)}
            configured={isGoogleCalendarConfigured()}
            result={query.googleCalendar}
            followUrl={associationCalendarFollowUrl()}
          />
        )}
        <div className="max-w-xl">
          <LogoutButton />
        </div>
      </div>
    </AppShell>
  );
}

