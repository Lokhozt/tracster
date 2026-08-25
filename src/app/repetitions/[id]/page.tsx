import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AvailabilityButtons } from "@/components/AvailabilityButtons";
import { EditRepetitionForm } from "@/components/ChoreographyForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { getRepetitionAudience, isRepetitionParticipant } from "@/lib/groups";
import {
  canEditChoreography,
  canViewChoreography,
} from "@/lib/permissions";
import { basicUserSelect, formatUserName } from "@/lib/users";

type PageProps = { params: Promise<{ id: string }> };

const statusStyles = {
  AVAILABLE: "text-green-700",
  UNAVAILABLE: "text-red-700",
  MAYBE: "text-amber-700",
} as const;

export default async function RepetitionDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const repetition = await prisma.repetitionEvent.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          members: { select: { userId: true } },
        },
      },
      choreography: {
        include: {
          members: {
            include: { user: { select: basicUserSelect } },
          },
        },
      },
      availabilities: {
        include: { user: { select: basicUserSelect } },
      },
    },
  });

  if (!repetition) {
    notFound();
  }

  if (!(await canViewChoreography(repetition.choreographyId, user.id))) {
    notFound();
  }

  const [canEdit, isParticipant, audience] = await Promise.all([
    canEditChoreography(repetition.choreographyId, user.id),
    isRepetitionParticipant(repetition, user.id),
    getRepetitionAudience(repetition),
  ]);

  const myResponse = repetition.availabilities.find((item) => item.userId === user.id);
  const targetMembers = repetition.choreography.members.filter((member) =>
    audience.memberIds.includes(member.userId),
  );

  return (
    <AppShell title={repetition.title ?? "Repetition"}>
      <div className="mb-6">
        <Link
          href={`/choreographies/${repetition.choreographyId}`}
          className="text-sm text-stone-600 hover:text-stone-900"
        >
          ← Back to {repetition.choreography.title}
        </Link>
      </div>

      <Card className="mb-6">
        <p className="text-sm text-stone-500">Choreography</p>
        <p className="font-medium">{repetition.choreography.title}</p>
        <p className="mt-3 text-sm text-stone-500">Participants</p>
        <p className="font-medium">
          {audience.groupName ?? "All participants"}
        </p>
      </Card>

      {canEdit ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Edit repetition</h2>
          <EditRepetitionForm
            repetition={{
              id: repetition.id,
              title: repetition.title,
              startsAt: repetition.startsAt.toISOString(),
              endsAt: repetition.endsAt?.toISOString() ?? null,
              location: repetition.location,
              notes: repetition.notes,
            }}
          />
        </Card>
      ) : (
        <Card className="mb-6">
          <div className="grid gap-2 text-sm text-stone-600">
            <p>
              <span className="font-medium text-stone-900">Start:</span>{" "}
              {formatDateTime(repetition.startsAt)}
            </p>
            {repetition.endsAt && (
              <p>
                <span className="font-medium text-stone-900">End:</span>{" "}
                {formatDateTime(repetition.endsAt)}
              </p>
            )}
            {repetition.location && (
              <p>
                <span className="font-medium text-stone-900">Location:</span>{" "}
                {repetition.location}
              </p>
            )}
            {repetition.notes && (
              <p>
                <span className="font-medium text-stone-900">Notes:</span> {repetition.notes}
              </p>
            )}
          </div>
        </Card>
      )}

      {isParticipant && (
        <Card className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Your availability</h2>
          <AvailabilityButtons
            repetitionId={repetition.id}
            currentStatus={myResponse?.status}
          />
        </Card>
      )}

      {canEdit && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Participant availability</h2>
          <div className="space-y-3">
            {targetMembers.map(({ user: member }) => {
              const response = repetition.availabilities.find(
                (item) => item.userId === member.id,
              );

              return (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{formatUserName(member)}</p>
                    <p className="text-sm text-stone-500">{member.email}</p>
                  </div>
                  <p
                    className={`text-sm font-medium ${
                      response ? statusStyles[response.status] : "text-stone-400"
                    }`}
                  >
                    {response?.status ?? "No response"}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
