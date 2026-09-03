import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { ChoreographiesList } from "@/components/ChoreographiesList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { listedChoreographyWhere } from "@/lib/participation";
import { hasGlobalAccess } from "@/lib/roles";
import { canCreateChoreography } from "@/lib/site-settings";
import { basicUserSelect, formatUserName } from "@/lib/users";

function isUserChoreographer(
  choreography: {
    createdById: string;
    choreographers: { userId: string }[];
  },
  userId: string,
): boolean {
  return (
    choreography.createdById === userId ||
    choreography.choreographers.some((item) => item.userId === userId)
  );
}

export default async function ChoreographiesPage() {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.Choreographies"),
  ]);
  if (!user) {
    redirect("/login");
  }

  const globalAccess = await hasGlobalAccess(user.id);
  const canCreate = await canCreateChoreography(user.id);

  const choreographies = await prisma.choreography.findMany({
    where: globalAccess ? visibleChoreographyWhere : listedChoreographyWhere(user.id),
    include: {
      createdBy: { select: basicUserSelect },
      choreographers: {
        where: { userId: user.id },
        select: { userId: true },
      },
      members: {
        where: { userId: user.id },
        select: { userId: true },
      },
      _count: { select: { members: true, rehearsals: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell title={t("title")}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-stone-600">
          {t("intro")}
        </p>
        {canCreate && (
          <Link
            href="/choreographies/new"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            {t("newChoreography")}
          </Link>
        )}
      </div>

      <ChoreographiesList
        canCreate={canCreate}
        choreographies={choreographies.map((choreography) => {
          const isChoreographer = isUserChoreographer(choreography, user.id);
          return {
            id: choreography.id,
            title: choreography.title,
            description: choreography.description,
            createdByName: formatUserName(choreography.createdBy),
            updatedAt: choreography.updatedAt.toISOString(),
            memberCount: choreography._count.members,
            rehearsalCount: choreography._count.rehearsals,
            isChoreographer,
            isInvolved:
              isChoreographer ||
              choreography.members.some((member) => member.userId === user.id),
          };
        })}
      />
    </AppShell>
  );
}
