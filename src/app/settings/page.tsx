import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LocationsManager } from "@/components/LocationsManager";
import { SiteSettingsForm } from "@/components/SiteSettingsForm";
import { UsersList } from "@/components/UsersList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageSettings } from "@/lib/roles";
import { getSiteSettings } from "@/lib/site-settings";
import { adminUserSelect, serializeAdminUser } from "@/lib/users";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!(await canManageSettings(user.id))) {
    redirect("/");
  }

  const [locations, settings, users] = await Promise.all([
    prisma.location.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getSiteSettings(),
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: adminUserSelect,
    }),
  ]);

  return (
    <AppShell title="Settings">
      <p className="mb-6 text-stone-600">
        Configure association-wide options, listed locations, and members.
      </p>
      <div className="space-y-8">
        <SiteSettingsForm settings={settings} />
        <LocationsManager locations={locations} />
        <UsersList users={users.map(serializeAdminUser)} />
      </div>
    </AppShell>
  );
}

