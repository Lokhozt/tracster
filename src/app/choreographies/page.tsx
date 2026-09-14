import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { ChoreographiesList } from "@/components/ChoreographiesList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { defaultEventTitle, type EventKind } from "@/lib/event-type-helpers";
import { eventTypeLabel, getServerTranslator } from "@/i18n/server";
import { listedChoreographyWhere } from "@/lib/participation";
import {
  CHOREOGRAPHY_REPRESENTATION_FILTER_COOKIE,
  parseChoreographyRepresentationFilter,
} from "@/lib/choreography-list-filter";
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

function representationOptions(
  links: Array<{
    event: {
      id: string;
      title: string;
      startsAt: Date;
      type: { name: string; kind: EventKind | null };
    };
  }>,
  translator: Awaited<ReturnType<typeof getServerTranslator>>,
) {
  const byId = new Map<string, { id: string; title: string; startsAt: string }>();
  for (const link of links) {
    if (byId.has(link.event.id)) {
      continue;
    }
    byId.set(link.event.id, {
      id: link.event.id,
      title: defaultEventTitle(
        {
          name: eventTypeLabel(translator, link.event.type.kind, link.event.type.name),
          kind: link.event.type.kind,
        },
        link.event.title,
      ),
      startsAt: link.event.startsAt.toISOString(),
    });
  }
  return [...byId.values()].sort((a, b) => {
    const byDate = a.startsAt.localeCompare(b.startsAt);
    return byDate !== 0 ? byDate : a.title.localeCompare(b.title);
  });
}

export default async function ChoreographiesPage() {
  const [user, t, translator, cookieStore] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.Choreographies"),
    getServerTranslator(),
    cookies(),
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
      eventLinks: {
        where: { event: { type: { kind: "REPRESENTATION" } } },
        select: {
          event: {
            select: {
              id: true,
              title: true,
              startsAt: true,
              type: { select: { name: true, kind: true } },
            },
          },
        },
      },
      _count: { select: { members: true, rehearsals: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const representations = representationOptions(
    choreographies.flatMap((choreography) => choreography.eventLinks),
    translator,
  );
  const savedRepresentationId = parseChoreographyRepresentationFilter(
    cookieStore.get(CHOREOGRAPHY_REPRESENTATION_FILTER_COOKIE)?.value,
  );
  const initialRepresentationId = representations.some(
    (representation) => representation.id === savedRepresentationId,
  )
    ? savedRepresentationId
    : "";

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
        representations={representations}
        initialRepresentationId={initialRepresentationId}
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
            representationIds: choreography.eventLinks.map((link) => link.event.id),
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
