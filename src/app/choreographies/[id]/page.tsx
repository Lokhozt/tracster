import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import {
  AssignChoreographerForm,
  AssignMemberForm,
  ChoreographersList,
  ParticipantsList,
  RehearsalsSection,
} from "@/components/ChoreographyForms";
import { DemonstrationsSection } from "@/components/EventForms";
import { EditChoreographyForm } from "@/components/CreateChoreographyForm";
import { GroupsSection } from "@/components/GroupForms";
import { JoinAsParticipantControls } from "@/components/JoinAsParticipantControls";
import { JoinRequestsList } from "@/components/JoinRequestsList";
import { ChoreographyLifecycleActions } from "@/components/ChoreographyLifecycleActions";
import { RepresentationsSection } from "@/components/RepresentationForms";
import { ChoreographerBadge } from "@/components/CrownIcon";
import { ChoreographyResources } from "@/components/ChoreographyResources";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { isAdmin } from "@/lib/roles";
import { getChoreographyGroups, serializeGroup } from "@/lib/groups";
import { getEventTypes } from "@/lib/event-types";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { basicUserSelect, formatUserName, serializeBasicUser } from "@/lib/users";
import { getVisibleChoreographyResources } from "@/lib/choreography-resources";

type PageProps = { params: Promise<{ id: string }> };

export default async function ChoreographyDetailPage({ params }: PageProps) {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.ChoreographyDetail"),
  ]);
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  if (!(await canViewChoreography(id, user.id))) {
    notFound();
  }

  const canEdit = await canEditChoreography(id, user.id);
  const canManageLifecycle = await isAdmin(user.id);

  const [choreography, users, groups, eventTypes, resources] = await Promise.all([
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
        joinRequests: {
          include: { user: { select: basicUserSelect } },
          orderBy: { requestedAt: "asc" },
        },
        rehearsals: {
          where: { type: { kind: "REHEARSAL" } },
          orderBy: { startsAt: "asc" },
          include: {
            ...listedLocationInclude,
            group: {
              select: {
                id: true,
                name: true,
                members: { select: { userId: true } },
              },
            },
            availabilities: {
              include: { user: { select: basicUserSelect } },
            },
          },
        },
        eventLinks: {
          where: {
            event: { type: { kind: { in: ["REPRESENTATION", "DEMONSTRATION"] } } },
          },
          include: {
            event: {
              include: {
                ...listedLocationInclude,
                type: { select: { kind: true } },
              },
            },
          },
          orderBy: { event: { startsAt: "asc" } },
        },
      },
    }),
    canEdit
      ? prisma.user.findMany({
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: basicUserSelect,
        }).then((items) => items.map(serializeBasicUser))
      : Promise.resolve([]),
    getChoreographyGroups(id),
    getEventTypes(),
    getVisibleChoreographyResources(id, user.id),
  ]);

  if (!choreography || choreography.archivedAt) {
    notFound();
  }

  const isMember = choreography.members.some((member) => member.userId === user.id);
  const hasPendingRequest = choreography.joinRequests.some(
    (request) => request.userId === user.id,
  );
  const representationLinks = choreography.eventLinks.filter(
    (link) => link.event.type.kind === "REPRESENTATION",
  );
  const demonstrationLinks = choreography.eventLinks.filter(
    (link) => link.event.type.kind === "DEMONSTRATION",
  );

  return (
    <AppShell
      title={
        <>
          {canEdit && <ChoreographerBadge className="text-xl" />}
          <span>{choreography.title}</span>
        </>
      }
    >
      <div className="mb-6 space-y-3">
        {choreography.description && (
          <p className="text-stone-600">{choreography.description}</p>
        )}
        <p className="text-sm text-stone-500">
          {t("createdBy", { name: formatUserName(choreography.createdBy) })}
        </p>
        <JoinAsParticipantControls
          joinUrl={`/api/choreographies/${id}/join`}
          requestUrl={`/api/choreographies/${id}/join-requests`}
          allowJoin={choreography.allowParticipantJoin}
          allowRequest={choreography.allowJoinRequests}
          isParticipant={isMember}
          hasPendingRequest={hasPendingRequest}
        />
      </div>

      <ChoreographyResources
        choreographyId={id}
        resources={resources}
        canEdit={canEdit}
      />

      {canEdit && (choreography.allowJoinRequests || choreography.joinRequests.length > 0) && (
        <div className="mb-6">
          <JoinRequestsList
            reviewUrl={`/api/choreographies/${id}/join-requests`}
            requests={choreography.joinRequests.map((request) => ({
              id: request.user.id,
              name: formatUserName(request.user),
            }))}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("choreographers")}</h2>
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
          <h2 className="mb-4 text-lg font-semibold">{t("participants")}</h2>
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

      <GroupsSection
        choreographyId={id}
        canEdit={canEdit}
        groups={groups.map(serializeGroup)}
        members={choreography.members.map(({ user }) => serializeBasicUser(user))}
      />

      <RepresentationsSection
        choreographyId={id}
        canEdit={canEdit}
        eventTypes={eventTypes}
        representations={representationLinks.map((link) => ({
          id: link.event.id,
          title: link.event.title || null,
          startsAt: link.event.startsAt.toISOString(),
          endsAt: link.event.endsAt?.toISOString() ?? null,
          location: displayLocation(link.event),
          locationId: link.event.locationId,
          notes: link.event.notes,
        }))}
      />

      <DemonstrationsSection
        choreographyId={id}
        choreographyTitle={choreography.title}
        canEdit={canEdit}
        eventTypes={eventTypes}
        participantOptions={users}
        demonstrations={demonstrationLinks.map((link) => ({
          id: link.event.id,
          title: link.event.title || null,
          startsAt: link.event.startsAt.toISOString(),
          endsAt: link.event.endsAt?.toISOString() ?? null,
          location: displayLocation(link.event),
        }))}
      />

      <RehearsalsSection
        choreographyId={id}
        canEdit={canEdit}
        groups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          memberCount: group.members.length,
        }))}
        eventTypes={eventTypes}
        rehearsals={choreography.rehearsals.map((rehearsal) => {
          const targetUserIds = new Set(
            rehearsal.group
              ? rehearsal.group.members.map((member) => member.userId)
              : choreography.members.map(({ userId }) => userId),
          );

          const targetAvailabilities = rehearsal.availabilities.filter((item) =>
            targetUserIds.has(item.userId),
          );

          return {
            id: rehearsal.id,
            title: rehearsal.title,
            startsAt: rehearsal.startsAt.toISOString(),
            endsAt: rehearsal.endsAt?.toISOString() ?? null,
            location: displayLocation(rehearsal),
            groupName: rehearsal.group?.name ?? null,
            availableNames: targetAvailabilities
              .filter((item) => item.status === "AVAILABLE")
              .map((item) => formatUserName(item.user)),
            unavailableNames: targetAvailabilities
              .filter((item) => item.status === "UNAVAILABLE")
              .map((item) => formatUserName(item.user)),
          };
        })}
      />

      {canEdit && (
        <Card className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">{t("editChoreography")}</h2>
          <EditChoreographyForm
            choreography={{
              id: choreography.id,
              title: choreography.title,
              description: choreography.description,
              allowParticipantJoin: choreography.allowParticipantJoin,
              allowJoinRequests: choreography.allowJoinRequests,
              hideFromNonParticipants: choreography.hideFromNonParticipants,
            }}
          />
        </Card>
      )}

      {canManageLifecycle && (
        <ChoreographyLifecycleActions
          choreographyId={choreography.id}
          title={choreography.title}
          upcomingRehearsals={choreography.rehearsals
            .filter((rehearsal) => rehearsal.startsAt >= new Date())
            .map((rehearsal) => ({
              id: rehearsal.id,
              title: rehearsal.title,
              startsAt: rehearsal.startsAt.toISOString(),
            }))}
          upcomingRepresentations={choreography.eventLinks
            .filter((link) => link.event.startsAt >= new Date())
            .map((link) => ({
              id: link.event.id,
              title: link.event.title || null,
              startsAt: link.event.startsAt.toISOString(),
            }))}
        />
      )}
    </AppShell>
  );
}
