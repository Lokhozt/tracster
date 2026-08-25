import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LocationsManager } from "@/components/LocationsManager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageSettings } from "@/lib/roles";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!(await canManageSettings(user.id))) {
    redirect("/");
  }

  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <AppShell title="Settings">
      <p className="mb-6 text-stone-600">
        Manage listed locations that can be reused on repetitions, representations, and events.
        A unique location can still be entered when scheduling.
      </p>
      <LocationsManager locations={locations} />
    </AppShell>
  );
}
