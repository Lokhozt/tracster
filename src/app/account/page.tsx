import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AccountProfileForm } from "@/components/AccountProfileForm";
import { GoogleCalendarConnectionCard } from "@/components/GoogleCalendarConnectionCard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
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

  const [connection, query] = await Promise.all([
    prisma.googleCalendarConnection.findUnique({
      where: { id: connectionIdFor("USER", user.id) },
    }),
    searchParams,
  ]);

  return (
    <AppShell title="Account">
      <p className="mb-6 text-stone-600">
        Update your contact details and connect a personal Google calendar for rehearsals.
      </p>
      <div className="space-y-8">
        <AccountProfileForm
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
          }}
        />
        <GoogleCalendarConnectionCard
          kind="user"
          connection={serializeGoogleConnection(connection)}
          configured={isGoogleCalendarConfigured()}
          result={query.googleCalendar}
        />
      </div>
    </AppShell>
  );
}
