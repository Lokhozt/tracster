import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  AssignChoreographerForm,
  AssignMemberForm,
  ChoreographersList,
  ParticipantsList,
  RepetitionsSection,
} from "@/components/ChoreographyForms";
import { RepresentationsSection } from "@/components/RepresentationForms";
import { ChoreographerBadge } from "@/components/CrownIcon";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { basicUserSelect, formatUserName, serializeBasicUser } from "@/lib/users";

type PageProps = { params: Promise<{ id: string }> };

export default async function ChoreographyDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  if (!(await canViewChoreography(id, user.id))) {
    notFound();
  }

  const canEdit = await canEditChoreography(id, user.id);

  const [choreography, users] = await Promise.all([
    prisma.choreography.findUnique({
      where: { id },
      include: {
        createdBy: { select: basicUserSelect },
        choreographers: {
          include: { user: { select: basicUserSelect } },
        },
        members: {
          include: { user: { select: basicUserSelect } },
        },
        repetitions: {
          orderBy: { startsAt: "asc" },
          include: {
            availabilities: {
              include: { user: { select: basicUserSelect } },
            },
          },
        },
        representations: {
          include: { representation: true },
          orderBy: { representation: { startsAt: "asc" } },
        },
      },
    }),
    canEdit
      ? prisma.user.findMany({
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: basicUserSelect,
        }).then((items) => items.map(serializeBasicUser))
      : Promise.resolve([]),
  ]);

  if (!choreography) {
    notFound();
  }

  return (
    <AppShell
      title={
        <>
          {canEdit && <ChoreographerBadge className="text-xl" />}
          <span>{choreography.title}</span>
        </>
      }
    >
      <div className="mb-6 space-y-2">
        {choreography.description && (
          <p className="text-stone-600">{choreography.description}</p>
        )}
        <p className="text-sm text-stone-500">
          Created by {formatUserName(choreography.createdBy)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Choreographers</h2>
          <ChoreographersList
            choreographyId={id}
            canEdit={canEdit}
            choreographers={choreography.choreographers.map(({ user }) =>
              serializeBasicUser(user),
            )}
          />
          {canEdit && (
            <AssignChoreographerForm
              choreographyId={id}
              users={users}
              assignedUserIds={choreography.choreographers.map(({ userId }) => userId)}
            />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Participants</h2>
          <ParticipantsList
            choreographyId={id}
            canEdit={canEdit}
            members={choreography.members.map(({ user }) => serializeBasicUser(user))}
          />
          {canEdit && (
            <AssignMemberForm
              choreographyId={id}
              users={users}
              assignedUserIds={choreography.members.map(({ userId }) => userId)}
            />
          )}
        </Card>
      </div>

      <RepresentationsSection
        choreographyId={id}
        canEdit={canEdit}
        representations={choreography.representations.map((link) => ({
          id: link.representation.id,
          title: link.representation.title,
          startsAt: link.representation.startsAt.toISOString(),
          endsAt: link.representation.endsAt?.toISOString() ?? null,
          location: link.representation.location,
          notes: link.representation.notes,
        }))}
      />

      <RepetitionsSection
        choreographyId={id}
        canEdit={canEdit}
        repetitions={choreography.repetitions.map((repetition) => ({
          id: repetition.id,
          title: repetition.title,
          startsAt: repetition.startsAt.toISOString(),
          endsAt: repetition.endsAt?.toISOString() ?? null,
          location: repetition.location,
          availableNames: repetition.availabilities
            .filter((item) => item.status === "AVAILABLE")
            .map((item) => formatUserName(item.user)),
          unavailableNames: repetition.availabilities
            .filter((item) => item.status === "UNAVAILABLE")
            .map((item) => formatUserName(item.user)),
        }))}
      />
    </AppShell>
  );
}
