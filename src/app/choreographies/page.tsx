import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChoreographerBadge } from "@/components/CrownIcon";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { hasGlobalAccess } from "@/lib/roles";
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

  const choreographies = await prisma.choreography.findMany({
    where: globalAccess
      ? undefined
      : {
          OR: [
            { createdById: user.id },
            { choreographers: { some: { userId: user.id } } },
            { members: { some: { userId: user.id } } },
          ],
        },
    include: {
      createdBy: { select: basicUserSelect },
      choreographers: {
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
          {globalAccess
            ? "All choreographies in the association."
            : "Manage choreographies you created, choreograph, or participate in."}
        </p>
        <Link
          href="/choreographies/new"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          New choreography
        </Link>
      </div>

      {choreographies.length === 0 ? (
        <Card>
          <p className="text-stone-600">No choreographies yet. Create your first one.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {choreographies.map((choreography) => {
            const isChoreographer = isUserChoreographer(choreography, user.id);

            return (
            <Link key={choreography.id} href={`/choreographies/${choreography.id}`}>
              <Card className="transition hover:border-stone-400">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      {isChoreographer && <ChoreographerBadge />}
                      <span>{choreography.title}</span>
                    </h2>
                    {choreography.description && (
                      <p className="mt-1 text-sm text-stone-600">{choreography.description}</p>
                    )}
                    <p className="mt-3 text-xs text-stone-500">
                      Created by {formatUserName(choreography.createdBy)} · Updated{" "}
                      {formatDateTime(choreography.updatedAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm text-stone-600 sm:text-right">
                    <p>{choreography._count.members} participants</p>
                    <p>{choreography._count.repetitions} repetitions</p>
                  </div>
                </div>
              </Card>
            </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
