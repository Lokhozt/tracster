import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SchedulingTool } from "@/components/SchedulingTool";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { isAdmin } from "@/lib/roles";

export default async function SchedulingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!(await isAdmin(user.id))) {
    redirect("/");
  }

  const [choreographies, locations] = await Promise.all([
    prisma.choreography.findMany({
      where: visibleChoreographyWhere,
      select: {
        id: true,
        title: true,
        groups: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { title: "asc" },
    }),
    prisma.location.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AppShell title="Scheduling">
      <p className="mb-6 text-stone-600">
        Build an optimized rehearsal weekend: pick pieces, days, and locations, then choose one of the
        generated calendars. Confirming creates the repetitions.
      </p>
      <SchedulingTool
        choreographies={choreographies}
        locations={locations}
      />
    </AppShell>
  );
}
