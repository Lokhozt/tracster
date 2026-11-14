import Link from "next/link";
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
import { TagBubbles } from "@/components/TagBubbles";
import { ChoreographyHeaderActions } from "@/components/ChoreographyHeaderActions";
import { ChoreographyEventActions } from "@/components/ChoreographyEventActions";
import { NextUpCard } from "@/components/NextUpCard";
import {
  ChoreographyOverviewActions,
  type OverviewAddAction,
} from "@/components/ChoreographyOverviewActions";
import { ChoreographyTeamActions } from "@/components/ChoreographyTeamActions";
import { type ChoreographySection, ChoreographySections, ChoreographyTabLink } from "@/components/ChoreographyTabs";
import { AvailabilityButtons } from "@/components/AvailabilityButtons";
import { LocalDateTime } from "@/components/LocalDateTime";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditChoreography, canManageChoreographyTags, canTransferChoreographyOwnership, canViewChoreography } from "@/lib/permissions";
import { isAdmin } from "@/lib/roles";
import { getChoreographyGroups, serializeGroup } from "@/lib/groups";
import { getEventTypes } from "@/lib/event-types";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { hasUpcomingSeriesEvents, loadSeriesSiblings } from "@/lib/event-series";
import { basicUserSelect, formatUserName, nestedUserNameOrderBy, serializeBasicUser, userNameOrderBy } from "@/lib/users";
import { getVisibleChoreographyResources } from "@/lib/choreography-resources";
import { getSiteSettings } from "@/lib/site-settings";
import { serializeTag } from "@/lib/tags";
import { isWhatsAppUrl } from "@/lib/whatsapp";
import { aboveCardLink, cardLink, cn } from "@/lib/utils";
import { ChevronRightIcon } from "@/components/icons";

/**
 * Dates lists: upcoming first (closest at the top), then past ones (most recent first).
 * An event counts as upcoming until it ends.
 */
function upcomingFirst<T>(items: T[], event: (item: T) => { startsAt: Date; endsAt: Date | null }, now: Date): T[] {
  const start = (item: T) => event(item).startsAt.getTime();
  const isUpcoming = (item: T) => (event(item).endsAt ?? event(item).startsAt) >= now;
  return [
    ...items.filter(isUpcoming).sort((left, right) => start(left) - start(right)),
    ...items.filter((item) => !isUpcoming(item)).sort((left, right) => start(right) - start(left)),
  ];
}

/** How many upcoming dates the overview's Events card lists. */
const UPCOMING_PREVIEW_COUNT = 2;

type PageProps = {
  params: Promise<{ id: string }>;
};

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
          orderBy: nestedUserNameOrderBy,
        },
        members: {
          include: { user: { select: basicUserSelect } },
          orderBy: nestedUserNameOrderBy,
        },
        joinRequests: {
          include: { user: { select: basicUserSelect } },
          orderBy: { requestedAt: "asc" },
        },
        rehearsals: {
          where: { type: { kind: "REHEARSAL" } },
          orderBy: { startsAt: "desc" },
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
            group: { select: { name: true } },
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
          orderBy: userNameOrderBy,
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
  const now = new Date();
  const upcomingRehearsals = choreography.rehearsals
    .filter((rehearsal) => (rehearsal.endsAt ?? rehearsal.startsAt) >= now)
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  const nextRehearsal = upcomingRehearsals[0] ?? null;
  const userIsInNextRehearsal = nextRehearsal
    ? nextRehearsal.group
      ? nextRehearsal.group.members.some((member) => member.userId === user.id)
      : isMember
    : false;
  const myNextRehearsalStatus =
    nextRehearsal?.availabilities.find((item) => item.userId === user.id)?.status;
  const upcomingEventLinks = choreography.eventLinks.filter(
    (link) => (link.event.endsAt ?? link.event.startsAt) >= now,
  );
  const nextPerformance = upcomingEventLinks[0] ?? null;
  const pinnedResources = resources.filter((resource) => resource.pinned);
  // Every upcoming date (rehearsals, representations, demonstrations), soonest first.
  const upcomingItems = [
    ...upcomingRehearsals.map((rehearsal) => ({
      id: rehearsal.id,
      startsAt: rehearsal.startsAt.toISOString(),
      label: [tc("rehearsal"), rehearsal.group?.name].filter(Boolean).join(" · "),
    })),
    ...upcomingEventLinks.map((link) => ({
      id: link.event.id,
      startsAt: link.event.startsAt.toISOString(),
      label:
        link.event.title ||
        (link.event.type.kind === "DEMONSTRATION" ? t("demonstration") : tc("representation")),
    })),
  ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const isChoreographer = choreographers.some((entry) => entry.id === user.id);
  // Rehearsal statistics: admins and the choreography's owner.
  const canViewStatistics = canManageLifecycle || choreography.createdById === user.id;
  const showGroups = canEdit || groups.length > 0;
  const assignedTags = choreography.tags.map((item) => serializeTag(item.tag));

  // The overview "+" (phones/tablets): every "add" of the sections below.
  const overviewAddActions: OverviewAddAction[] = canEdit
    ? [
        { kind: "rehearsal", section: "events", label: tc("scheduleRehearsal") },
        { kind: "representation", section: "events", label: tc("addRepresentation") },
        ...(eventTypes.some((type) => type.kind === "DEMONSTRATION")
          ? [{ kind: "demonstration", section: "events", label: tc("addDemonstration") }]
          : []),
        { href: `/choreographies/${id}/resources/new`, label: tc("addResource") },
        { kind: "add-participant", section: "participants", label: tc("addParticipant") },
        { kind: "add-choreographer", section: "participants", label: tc("addChoreographer") },
        ...(participants.length > 0
          ? [{ kind: "group", section: "groups", label: tc("newGroup") }]
          : []),
      ]
    : [];

  const sections: ChoreographySection[] = [
    {
      id: "overview",
      content: (
        // Overview first: next rehearsal, pinned resources, team, description (two per row on desktops).
        <div className="grid gap-4 lg:grid-cols-2">
          <ChoreographyOverviewActions actions={overviewAddActions} />
          {/* The page's one bold element: the next rehearsal, on the stage colour. */}
          {nextRehearsal ? (
            <NextUpCard
              label={t("nextRehearsal")}
              href={`/events/${nextRehearsal.id}`}
              startsAt={nextRehearsal.startsAt.toISOString()}
              endsAt={nextRehearsal.endsAt?.toISOString() ?? null}
              title={nextRehearsal.title || tc("rehearsal")}
              subtitle={nextRehearsal.group?.name}
              location={displayLocation(nextRehearsal)}
              footer={
                nextPerformance && (
                  <Link
                    href={`/events/${nextPerformance.event.id}`}
                    className="block px-1 text-sm hover:underline"
                  >
                    <span className="text-stone-500">{t("nextPerformance")} · </span>
                    <span className="font-medium text-stone-900">
                      {nextPerformance.event.title || tc("representation")}
                    </span>
                    <span className="text-stone-600">
                      {" · "}
                      <LocalDateTime value={nextPerformance.event.startsAt.toISOString()} />
                    </span>
                  </Link>
                )
              }
            >
              {userIsInNextRehearsal && (
                <AvailabilityButtons
                  rehearsalId={nextRehearsal.id}
                  currentStatus={myNextRehearsalStatus}
                />
              )}
            </NextUpCard>
          ) : (
            <Card>
              <h2 className="mb-1 text-base font-semibold">{t("nextRehearsal")}</h2>
              <p className="text-sm text-stone-600">{t("noUpcomingRehearsal")}</p>
            </Card>
          )}
          {/* All upcoming dates of the choreography; opens the full events section. */}
          <Card className="relative transition hover:border-stone-400">
            <h2 className="mb-2 text-base font-semibold text-stone-900">
              <ChoreographyTabLink
                sectionId="events"
                className={cn("flex items-center justify-between gap-3", cardLink)}
              >
                {t("eventsTab")}
                <ChevronRightIcon />
              </ChoreographyTabLink>
            </h2>
            <p className="text-sm text-stone-600">
              {t("upcomingEventCount", { count: upcomingItems.length })}
            </p>
            {upcomingItems.length > 0 && (
              <ul className="mt-2 divide-y divide-stone-100">
                {upcomingItems.slice(0, UPCOMING_PREVIEW_COUNT).map((item) => (
                  <li key={item.id} className="flex min-h-10 items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate text-stone-900">{item.label}</span>
                    <span className="shrink-0 text-sm text-stone-500">
                      <LocalDateTime value={item.startsAt} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {pinnedResources.length > 0 && (
            // Like the team card: the whole card opens the Resources tab (full previews live there);
            // web links can still be opened directly.
            <Card className="relative transition hover:border-stone-400">
              <h2 className="mb-2 text-base font-semibold text-stone-900">
                <ChoreographyTabLink
                  sectionId="resources"
                  className={cn("flex items-center justify-between gap-3", cardLink)}
                >
                  {t("pinnedResources")}
                  <ChevronRightIcon />
                </ChoreographyTabLink>
              </h2>
              <ul className="divide-y divide-stone-100">
                {pinnedResources.map((resource) => (
                  <li key={resource.id} className="flex min-h-11 items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate text-stone-900">
                      {resource.description || resource.fileName || resource.url}
                    </span>
                    {resource.type === "LINK" && resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "shrink-0 text-sm font-medium text-stone-600 hover:text-stone-900",
                          aboveCardLink,
                        )}
                      >
                        {t("openResource")} ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {/* The whole card opens the team tab; the join controls stay clickable on their own. */}
          <Card className="relative transition hover:border-stone-400">
            <h2 className="mb-2 text-base font-semibold text-stone-900">
              <ChoreographyTabLink
                sectionId="participants"
                className={cn("flex items-center justify-between gap-3", cardLink)}
              >
                {t("people")}
                <ChevronRightIcon />
              </ChoreographyTabLink>
            </h2>
            <p className="text-stone-900">
              <span className="text-stone-500">{t("choreographers")} : </span>
              {choreographers.map((entry) => entry.name).join(", ") || "—"}
            </p>
            <p className="mt-1 text-stone-900">
              {t("participantCount", { count: participants.length })}
            </p>
            <div className={cn("mt-3", aboveCardLink)}>
              <JoinAsParticipantControls
                joinUrl={`/api/choreographies/${id}/join`}
                requestUrl={`/api/choreographies/${id}/join-requests`}
                allowJoin={choreography.allowParticipantJoin}
                allowRequest={choreography.allowJoinRequests}
                isParticipant={isMember}
                hasPendingRequest={hasPendingRequest}
              />
            </div>
          </Card>
          {showGroups && (
            // Like the other cards: the whole card opens the Groupes tab.
            <Card className="relative transition hover:border-stone-400">
              <h2 className="mb-2 text-base font-semibold text-stone-900">
                <ChoreographyTabLink
                  sectionId="groups"
                  className={cn("flex items-center justify-between gap-3", cardLink)}
                >
                  {tc("groups")}
                  <ChevronRightIcon />
                </ChoreographyTabLink>
              </h2>
              {groups.length === 0 ? (
                <p className="text-sm text-stone-600">{tc("noGroups")}</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {groups.map((group) => (
                    <li key={group.id} className="flex min-h-10 items-center justify-between gap-3 py-1.5">
                      <span className="min-w-0 truncate text-stone-900">{group.name}</span>
                      <span className="shrink-0 text-sm text-stone-500">
                        {t("participantCount", { count: group.members.length })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {/* Assigned tags first, then the description; tags are edited from the edit section. */}
          {(choreography.description || (settings.showChoreographyTags && assignedTags.length > 0)) && (
            <Card className="space-y-3">
              <h2 className="text-base font-semibold text-stone-900">
                {tc("description")}
              </h2>
              {settings.showChoreographyTags && <TagBubbles tags={assignedTags} />}
              {choreography.description && (
                <p className="whitespace-pre-wrap text-stone-700">{choreography.description}</p>
              )}
            </Card>
          )}
          {canManageLifecycle && (
            // Admins only, last and in red: it leads to archive / delete.
            <Card className="relative border-red-200 transition hover:border-red-400">
              <h2 className="mb-2 text-base font-semibold text-red-700">
                <ChoreographyTabLink
                  sectionId="admin"
                  className={cn("flex items-center justify-between gap-3", cardLink)}
                >
                  {tc("adminActions")}
                  <ChevronRightIcon className="text-red-400" />
                </ChoreographyTabLink>
              </h2>
              <p className="text-sm text-red-700">
                {tc("archiveChoreography")} · {tc("deleteChoreography")}
              </p>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: "resources",
      content: (
        <ChoreographyResources
          choreographyId={id}
          resources={resources}
          canEdit={canEdit}
          tabSectionId="resources"
        />
      ),
    },
    {
      id: "participants",
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
              {/* Phones/tablets: these forms open from the "+" button (ChoreographyTeamActions). */}
              <div className="hidden lg:block">
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
              </div>
            </Card>
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t("participants")}</h2>
              <ParticipantsList
                choreographyId={id}
                canEdit={canEdit}
                members={participants}
              />
              {canEdit && (
                <div className="hidden lg:block">
                  <AssignMemberForm
                    choreographyId={id}
                    users={users}
                    assignedUserIds={choreography.members.map(({ userId }) => userId)}
                  />
                </div>
              )}
            </Card>
          </div>
          <ChoreographyTeamActions
            sectionId="participants"
            actions={[
              ...(canEdit
                ? [
                    {
                      id: "add-choreographer",
                      label: tc("addChoreographer"),
                      form: (
                        <AssignChoreographerForm
                          choreographyId={id}
                          users={users}
                          assignedUserIds={choreography.choreographers.map(({ userId }) => userId)}
                        />
                      ),
                    },
                    {
                      id: "add-participant",
                      label: tc("addParticipant"),
                      form: (
                        <AssignMemberForm
                          choreographyId={id}
                          users={users}
                          assignedUserIds={choreography.members.map(({ userId }) => userId)}
                        />
                      ),
                    },
                  ]
                : []),
              ...(canTransferOwnership
                ? [
                    {
                      id: "transfer-ownership",
                      label: tc("transferOwnership"),
                      form: (
                        <TransferChoreographyOwnershipForm
                          choreographyId={id}
                          ownerUserId={choreography.createdById}
                          choreographers={choreographers}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
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
    ...(showGroups
      ? [
          {
            id: "groups",
            content: (
              <GroupsSection
                choreographyId={id}
                canEdit={canEdit}
                groups={groups.map(serializeGroup)}
                members={participants}
                tabSectionId="groups"
              />
            ),
          },
        ]
      : []),
    {
      // Rehearsals, representations and demonstrations in one place, like the planning.
      id: "events",
      content: (
        <div className="space-y-8">
          <ChoreographyEventActions
            sectionId="events"
            choreographyId={id}
            canEdit={canEdit}
            canAddDemonstration={eventTypes.some((type) => type.kind === "DEMONSTRATION")}
            canViewStatistics={canViewStatistics}
          />
          <section>
            <RehearsalsSection
              actionsInFloatingMenu
              canViewStatistics={canViewStatistics}
              choreographyId={id}
              choreographyTitle={choreography.title}
              canEdit={canEdit}
              groups={groups.map((group) => ({
                id: group.id,
                name: group.name,
                memberCount: group.members.length,
              }))}
              eventTypes={eventTypes}
              rehearsals={upcomingFirst(choreography.rehearsals, (rehearsal) => rehearsal, now).map((rehearsal) => {
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
          </section>
          {(canEdit || representationLinks.length > 0) && (
            <section>
              <RepresentationsSection
                actionsInFloatingMenu
                choreographyId={id}
                canEdit={canEdit}
                eventTypes={eventTypes}
                representations={upcomingFirst(representationLinks, (link) => link.event, now).map((link) => ({
                  id: link.event.id,
                  title: link.event.title || null,
                  startsAt: link.event.startsAt.toISOString(),
                  endsAt: link.event.endsAt?.toISOString() ?? null,
                  location: displayLocation(link.event),
                  locationId: link.event.locationId,
                  notes: link.event.notes,
                }))}
              />
            </section>
          )}
          {(canEdit || demonstrationLinks.length > 0) && (
            <section>
              <DemonstrationsSection
                actionsInFloatingMenu
                choreographyId={id}
                choreographyTitle={choreography.title}
                canEdit={canEdit}
                eventTypes={eventTypes}
                participantOptions={users}
                groups={groups.map((group) => ({
                  id: group.id,
                  name: group.name,
                  memberCount: group.members.length,
                }))}
                demonstrations={upcomingFirst(demonstrationLinks, (link) => link.event, now).map((link) => ({
                  id: link.event.id,
                  title: link.event.title || null,
                  startsAt: link.event.startsAt.toISOString(),
                  endsAt: link.event.endsAt?.toISOString() ?? null,
                  location: displayLocation(link.event),
                  groupName: link.group?.name ?? null,
                }))}
              />
            </section>
          )}
        </div>
      ),
    },
  ];

  // Edit form and admin actions: opened from the title-row edit button and the admin card.
  const extraSections: Array<{ id: string; content: React.ReactNode }> = [];
  if (canEdit || canManageTags) {
    extraSections.push({
      id: "edit",
      content: (
        <div className="space-y-6">
          {canEdit && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t("editChoreography")}</h2>
              <EditChoreographyForm
                choreography={{
                  id: choreography.id,
                  title: choreography.title,
                  description: choreography.description,
                  whatsappUrl: choreography.whatsappUrl,
                  allowParticipantJoin: choreography.allowParticipantJoin,
                  allowJoinRequests: choreography.allowJoinRequests,
                  hideFromNonParticipants: choreography.hideFromNonParticipants,
                }}
              />
            </Card>
          )}
          {canManageTags && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{tc("tags")}</h2>
              <ChoreographyTagsEditor
                choreographyId={id}
                allTags={allTags.map(serializeTag)}
                assignedTags={assignedTags}
                canEdit
                visible={settings.showChoreographyTags}
              />
            </Card>
          )}
        </div>
      ),
    });
  }

  if (canManageLifecycle) {
    extraSections.push({
      id: "admin",
      content: (
        <ChoreographyLifecycleActions
          choreographyId={choreography.id}
          title={choreography.title}
          upcomingRehearsals={choreography.rehearsals
            .filter((rehearsal) => rehearsal.startsAt >= new Date())
            .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
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
      narrow
      title={choreography.title}
      titleActions={
        <ChoreographyHeaderActions
          whatsappUrl={
            choreography.whatsappUrl && isWhatsAppUrl(choreography.whatsappUrl)
              ? choreography.whatsappUrl
              : null
          }
          canEdit={canEdit || canManageTags}
        />
      }
    >
      {isChoreographer && (
        <p className="-mt-4 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            <ChoreographerBadge className="text-sm" />
            {t("youAreChoreographer")}
          </span>
        </p>
      )}
      <ChoreographySections sections={[...sections, ...extraSections]} />
    </AppShell>
  );
}
