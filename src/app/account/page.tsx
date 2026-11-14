import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { AccountIdentityCard } from "@/components/AccountIdentityCard";
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
import { canManageAssociationGoogleCalendar } from "@/lib/roles";
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

  const [connection, query, locale, t, cookieStore, tComponents, tNavigation, canManageAssociationCalendar] = await Promise.all([
    prisma.googleCalendarConnection.findUnique({
      where: { id: connectionIdFor("USER", user.id) },
    }),
    searchParams,
    getLocale(),
    getTranslations("Account"),
    cookies(),
    getTranslations("Components"),
    getTranslations("Navigation"),
    canManageAssociationGoogleCalendar(user.id),
  ]);
  const themePreference = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);
  const settingsLinks = [
    { section: "general", label: "siteSettings" },
    ...(canManageAssociationCalendar ? [{ section: "calendar", label: "associationCalendar" }] : []),
    { section: "event-types", label: "eventTypes" },
    { section: "tags", label: "tags" },
    { section: "locations", label: "locations" },
    { section: "members", label: "users" },
    { section: "stats", label: "stats" },
  ] as const;

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
        {/* Preferences and shortcuts as compact rows. */}
        <div className="max-w-xl divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="font-medium">{tComponents("themeTitle")}</span>
            <ThemeToggle initialPreference={themePreference} />
          </div>
          <CompetitorStatusToggle userId={user.id} isCompetitor={user.isCompetitor} forSelf variant="row" />
          {canHoldAdminPrivileges(user.role) && (
            <AdminPrivilegesToggle enabled={user.adminPrivilegesEnabled} variant="row" />
          )}
        </div>
        {hasAdminPrivileges(user) && (
          <section className="max-w-xl">
            <h2 className="mb-2 px-1 text-xs font-semibold text-stone-500">
              {tNavigation("administration")}
            </h2>
            {/* Every settings category one tap away (opens /settings on that category). */}
            <div className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <AccountLink href="/scheduling">{tNavigation("scheduling")}</AccountLink>
              {settingsLinks.map((link) => (
                <AccountLink key={link.section} href={`/settings?section=${link.section}`}>
                  {tComponents(link.label)}
                </AccountLink>
              ))}
            </div>
          </section>
        )}
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
