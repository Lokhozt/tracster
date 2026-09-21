import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import {
  AssignChoreographerForm,
  AssignMemberForm,
  ChoreographersList,
  ParticipantsList,
  RehearsalsSection,
  TransferChoreographyOwnershipForm,
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
import { ChoreographyTagsEditor } from "@/components/ChoreographyTagsEditor";
import { SectionNav, type NavSection } from "@/components/SettingsSections";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditChoreography, canManageChoreographyTags, canTransferChoreographyOwnership, canViewChoreography } from "@/lib/permissions";
import { isAdmin } from "@/lib/roles";
import { getChoreographyGroups, serializeGroup } from "@/lib/groups";
import { getEventTypes } from "@/lib/event-types";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { hasUpcomingSeriesEvents, loadSeriesSiblings } from "@/lib/event-series";
import { basicUserSelect, formatUserName, serializeBasicUser } from "@/lib/users";
import { getVisibleChoreographyResources } from "@/lib/choreography-resources";
import { getSiteSettings } from "@/lib/site-settings";
import { serializeTag } from "@/lib/tags";

type PageProps = { params: Promise<{ id: string }> };

export default async function ChoreographyDetailPage({ params }: PageProps) {
  const [user, t, tc] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.ChoreographyDetail"),
    getTranslations("Components"),
  ]);
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  if (!(await canViewChoreography(id, user.id))) {
    notFound();
  }

  const canEdit = await canEditChoreography(id, user.id);
  const canManageTags = await canManageChoreographyTags(id, user.id);
  const canTransferOwnership = await canTransferChoreographyOwnership(id, user.id);
  const canManageLifecycle = await isAdmin(user.id);

  const [choreography, users, groups, eventTypes, resources, allTags, settings] = await Promise.all([
    prisma.choreography.findUnique({
      where: { id },
      include: {
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
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
          orderBy: { tag: { name: "asc" } },
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
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    getSiteSettings(),
  ]);

  if (!choreography || choreography.archivedAt) {
    notFound();
  }

  const rehearsalSeriesSiblings = await loadSeriesSiblings(choreography.rehearsals);

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
  const choreographers = choreography.choreographers.map(({ user }) => serializeBasicUser(user));
  const participants = choreography.members.map(({ user }) => serializeBasicUser(user));
  const showJoinRequests =
    canEdit && (choreography.allowJoinRequests || choreography.joinRequests.length > 0);

  const sections: NavSection[] = [
    {
      id: "overview",
      label: t("overview"),
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            {choreography.description && (
              <p className="text-stone-600">{choreography.description}</p>
            )}
            <ChoreographyTagsEditor
              choreographyId={id}
              allTags={allTags.map(serializeTag)}
              assignedTags={choreography.tags.map((item) => serializeTag(item.tag))}
              canEdit={canManageTags}
              visible={settings.showChoreographyTags}
            />
          </div>
          <JoinAsParticipantControls
            joinUrl={`/api/choreographies/${id}/join`}
            requestUrl={`/api/choreographies/${id}/join-requests`}
            allowJoin={choreography.allowParticipantJoin}
            allowRequest={choreography.allowJoinRequests}
            isParticipant={isMember}
            hasPendingRequest={hasPendingRequest}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t("choreographers")}</h2>
              <ChoreographersList
                choreographyId={id}
                canEdit={false}
                ownerUserId={choreography.createdById}
                choreographers={choreographers}
              />
            </Card>
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t("participants")}</h2>
              <ParticipantsList
                choreographyId={id}
                canEdit={false}
                members={participants}
              />
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: "participants",
      label: t("participants"),
      content: (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t("choreographers")}</h2>
              <ChoreographersList
                choreographyId={id}
                canEdit={canEdit}
                ownerUserId={choreography.createdById}
                choreographers={choreographers}
              />
              {canEdit && (
                <AssignChoreographerForm
                  choreographyId={id}
                  users={users}
                  assignedUserIds={choreography.choreographers.map(({ userId }) => userId)}
                />
              )}
              {canTransferOwnership && (
                <TransferChoreographyOwnershipForm
                  choreographyId={id}
                  ownerUserId={choreography.createdById}
                  choreographers={choreographers}
                />
              )}
            </Card>
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t("participants")}</h2>
              <ParticipantsList
                choreographyId={id}
                canEdit={canEdit}
                members={participants}
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
          {showJoinRequests && (
            <JoinRequestsList
              reviewUrl={`/api/choreographies/${id}/join-requests`}
              requests={choreography.joinRequests.map((request) => ({
                id: request.user.id,
                name: formatUserName(request.user),
              }))}
            />
          )}
        </div>
      ),
    },
    {
      id: "resources",
      label: t("resources"),
      content: (
        <ChoreographyResources
          choreographyId={id}
          resources={resources}
          canEdit={canEdit}
        />
      ),
    },
    {
      id: "groups",
      label: tc("groups"),
      content: (
        <GroupsSection
          choreographyId={id}
          canEdit={canEdit}
          groups={groups.map(serializeGroup)}
          members={participants}
        />
      ),
    },
    {
      id: "representations",
      label: tc("representations"),
      content: (
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
      ),
    },
    {
      id: "demonstrations",
      label: t("demonstrations"),
      content: (
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
      ),
    },
    {
      id: "rehearsals",
      label: tc("rehearsals"),
      content: (
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
              hasUpcomingSeriesEvents: hasUpcomingSeriesEvents(
                rehearsal,
                rehearsalSeriesSiblings,
              ),
            };
          })}
        />
      ),
    },
  ];

  if (canEdit) {
    sections.push({
      id: "edit",
      label: t("editChoreography"),
      content: (
        <Card>
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
      ),
    });
  }

  if (canManageLifecycle) {
    sections.push({
      id: "admin",
      label: tc("adminActions"),
      content: (
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
      ),
    });
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
      <SectionNav
        sections={sections}
        categoriesLabel={t("categories")}
        backLabel={t("backToSections")}
      />
    </AppShell>
  );
}
