import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { SchedulingTool } from "@/components/SchedulingTool";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { isAdmin } from "@/lib/roles";

export default async function SchedulingPage() {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.Scheduling"),
  ]);
  if (!user) {
    redirect("/login");
  }

  if (!(await isAdmin(user.id))) {
    redirect("/");
  }

  const [choreographies, locations, collections] = await Promise.all([
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
    prisma.schedulingCollection.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        items: {
          orderBy: { sortOrder: "asc" },
          select: {
            choreographyId: true,
            groupId: true,
            durationMinutes: true,
          },
        },
      },
    }),
  ]);

  return (
    <AppShell title={t("title")}>
      <p className="mb-6 text-stone-600">
        {t("intro")}
      </p>
      <SchedulingTool
        choreographies={choreographies}
        locations={locations}
        initialCollections={collections}
      />
    </AppShell>
  );
}
