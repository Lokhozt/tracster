import Link from "next/link";
import { redirect } from "next/navigation";
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
  const user = await getCurrentUser();
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
      _count: { select: { members: true, repetitions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell title="Choreographies">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-stone-600">
          By default this list shows choreographies you created, choreograph, or participate in.
        </p>
        {canCreate && (
          <Link
            href="/choreographies/new"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            New choreography
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
            repetitionCount: choreography._count.repetitions,
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
