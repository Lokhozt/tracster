import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { EventTypesManager } from "@/components/EventTypesManager";
import { LocationsManager } from "@/components/LocationsManager";
import { TagsManager } from "@/components/TagsManager";
import { SettingsSections, type SettingsSection } from "@/components/SettingsSections";
import { SiteSettingsForm } from "@/components/SiteSettingsForm";
import { GoogleCalendarConnectionCard } from "@/components/GoogleCalendarConnectionCard";
import { UsersList } from "@/components/UsersList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageAssociationGoogleCalendar, canManageSettings } from "@/lib/roles";
import { getEventTypes } from "@/lib/event-types";
import { getSiteSettings } from "@/lib/site-settings";
import { adminUserSelect, serializeAdminUser, userNameOrderBy } from "@/lib/users";
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
  const [user, t, tc] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.Settings"),
    getTranslations("Components"),
  ]);
  if (!user) {
    redirect("/login");
  }

  if (!(await canManageSettings(user.id))) {
    redirect("/");
  }

  const showAssociationCalendar = await canManageAssociationGoogleCalendar(user.id);

  const [locations, settings, users, eventTypes, tags, googleConnection, query] = await Promise.all([
    prisma.location.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getSiteSettings(),
    prisma.user.findMany({
      orderBy: userNameOrderBy,
      select: adminUserSelect,
    }),
    getEventTypes(),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    showAssociationCalendar
      ? prisma.googleCalendarConnection.findUnique({
          where: { id: connectionIdFor("ASSOCIATION", user.id) },
        })
      : Promise.resolve(null),
    searchParams,
  ]);

  const sections: SettingsSection[] = [
    {
      id: "general",
      label: tc("siteSettings"),
      content: <SiteSettingsForm settings={settings} />,
    },
    ...(showAssociationCalendar
      ? [
          {
            id: "calendar",
            label: tc("associationCalendar"),
            content: (
              <GoogleCalendarConnectionCard
                kind="association"
                connection={serializeGoogleConnection(googleConnection)}
                configured={isGoogleCalendarConfigured()}
                result={query.googleCalendar}
                followUrl={associationCalendarFollowUrl()}
              />
            ),
          },
        ]
      : []),
    {
      id: "event-types",
      label: tc("eventTypes"),
      content: <EventTypesManager eventTypes={eventTypes} />,
    },
    {
      id: "tags",
      label: tc("tags"),
      content: <TagsManager tags={tags} settings={settings} />,
    },
    {
      id: "locations",
      label: tc("locations"),
      content: <LocationsManager locations={locations} />,
    },
    {
      id: "members",
      label: tc("users"),
      content: <UsersList users={users.map(serializeAdminUser)} />,
    },
  ];

  return (
    <AppShell title={t("title")}>
      <SettingsSections
        sections={sections}
        intro={t("intro")}
        // Returning from the Google consent screen should land on the calendar category.
        initialSectionId={query.googleCalendar ? "calendar" : undefined}
      />
    </AppShell>
  );
}

