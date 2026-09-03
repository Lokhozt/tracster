import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { AccountProfileForm } from "@/components/AccountProfileForm";
import { GoogleCalendarConnectionCard } from "@/components/GoogleCalendarConnectionCard";
import { LogoutButton } from "@/components/LogoutButton";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  const [connection, query, locale, t] = await Promise.all([
    prisma.googleCalendarConnection.findUnique({
      where: { id: connectionIdFor("USER", user.id) },
    }),
    searchParams,
    getLocale(),
    getTranslations("Account"),
  ]);

  return (
    <AppShell title={t("title")}>
      <p className="mb-6 text-stone-600">
        {t("intro")}
      </p>
      <div className="space-y-8">
        <AccountProfileForm
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            displayLanguage: locale === "en" ? "english" : "french",
          }}
        />
        <GoogleCalendarConnectionCard
          kind="user"
          connection={serializeGoogleConnection(connection)}
          configured={isGoogleCalendarConfigured()}
          result={query.googleCalendar}
          followUrl={associationCalendarFollowUrl()}
        />
        <Card className="max-w-xl">
          <h2 className="mb-2 text-lg font-semibold">{t("session")}</h2>
          <p className="mb-4 text-sm text-stone-600">{t("signOutHelp")}</p>
          <LogoutButton />
        </Card>
      </div>
    </AppShell>
  );
}
