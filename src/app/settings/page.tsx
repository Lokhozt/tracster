import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EventTypesManager } from "@/components/EventTypesManager";
import { LocationsManager } from "@/components/LocationsManager";
import { SiteSettingsForm } from "@/components/SiteSettingsForm";
import { GoogleCalendarConnectionCard } from "@/components/GoogleCalendarConnectionCard";
import { UsersList } from "@/components/UsersList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageAssociationGoogleCalendar, canManageSettings } from "@/lib/roles";
import { getEventTypes } from "@/lib/event-types";
import { getSiteSettings } from "@/lib/site-settings";
import { adminUserSelect, serializeAdminUser } from "@/lib/users";
import {
  associationCalendarFollowUrl,
  connectionIdFor,
  isGoogleCalendarConfigured,
  serializeGoogleConnection,
} from "@/lib/google-calendar";

type PageProps = {
  searchParams: Promise<{ googleCalendar?: string }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!(await canManageSettings(user.id))) {
    redirect("/");
  }

  const showAssociationCalendar = await canManageAssociationGoogleCalendar(user.id);

  const [locations, settings, users, eventTypes, googleConnection, query] = await Promise.all([
    prisma.location.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getSiteSettings(),
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: adminUserSelect,
    }),
    getEventTypes(),
    showAssociationCalendar
      ? prisma.googleCalendarConnection.findUnique({
          where: { id: connectionIdFor("ASSOCIATION", user.id) },
        })
      : Promise.resolve(null),
    searchParams,
  ]);

  return (
    <AppShell title="Settings">
      <p className="mb-6 text-stone-600">
        Configure association-wide options, listed locations, and members.
      </p>
      <div className="space-y-8">
        <SiteSettingsForm settings={settings} />
        {showAssociationCalendar && (
          <GoogleCalendarConnectionCard
            kind="association"
            connection={serializeGoogleConnection(googleConnection)}
            configured={isGoogleCalendarConfigured()}
            result={query.googleCalendar}
            followUrl={associationCalendarFollowUrl()}
          />
        )}
        <EventTypesManager eventTypes={eventTypes} />
        <LocationsManager locations={locations} />
        <UsersList users={users.map(serializeAdminUser)} />
      </div>
    </AppShell>
  );
}

