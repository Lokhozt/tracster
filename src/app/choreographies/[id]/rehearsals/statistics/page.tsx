import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { RehearsalStatisticsPanel } from "@/components/RehearsalStatisticsPanel";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewChoreography } from "@/lib/permissions";
import { computeRehearsalStatistics } from "@/lib/rehearsal-statistics";
import { basicUserSelect, formatUserName, nestedUserNameOrderBy } from "@/lib/users";

type PageProps = { params: Promise<{ id: string }> };

export default async function ChoreographyRehearsalStatisticsPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  if (!(await canViewChoreography(id, user.id))) {
    notFound();
  }

  const [t, choreography] = await Promise.all([
    getTranslations("Pages.ChoreographyRehearsalStatistics"),
    prisma.choreography.findUnique({
      where: { id },
      select: {
        id: true,
        archivedAt: true,
        members: {
          include: { user: { select: basicUserSelect } },
          orderBy: nestedUserNameOrderBy,
        },
        rehearsals: {
          where: { type: { kind: "REHEARSAL" } },
          orderBy: { startsAt: "asc" },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            groupId: true,
            group: {
              select: {
                members: { select: { userId: true } },
              },
            },
            availabilities: {
              select: { userId: true, status: true },
            },
          },
        },
      },
    }),
  ]);

  if (!choreography || choreography.archivedAt) {
    notFound();
  }

  const memberIds = choreography.members.map((member) => member.userId);
  const participantNames = new Map(
    choreography.members.map((member) => [member.userId, formatUserName(member.user)]),
  );
  const statistics = computeRehearsalStatistics(choreography.rehearsals, memberIds);

  return (
    <AppShell title={t("title")}>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={`/choreographies/${id}?section=rehearsals`}
          className="inline-flex text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          {t("backToRehearsals")}
        </Link>

        <RehearsalStatisticsPanel
          rehearsalCount={statistics.rehearsalCount}
          totalMinutes={statistics.totalMinutes}
          participants={statistics.participants}
          participantNames={participantNames}
        />
      </div>
    </AppShell>
  );
}
