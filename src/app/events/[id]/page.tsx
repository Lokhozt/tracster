import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { AvailabilityButtons } from "@/components/AvailabilityButtons";
import { ManualAvailabilityCheckButton } from "@/components/ManualAvailabilityCheckButton";
import {
  AssignEventParticipantForm,
  EventParticipantsList,
} from "@/components/EventForms";
import { JoinAsParticipantControls } from "@/components/JoinAsParticipantControls";
import { JoinRequestsList } from "@/components/JoinRequestsList";
import { LocalDateTime } from "@/components/LocalDateTime";
import { RepresentationChoreographiesSection } from "@/components/RepresentationForms";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditEvent, canViewEvent, serializeEvent } from "@/lib/events";
import { hasUpcomingSeriesEvents, loadSeriesSiblings } from "@/lib/event-series";
import { eventKindAllowsChoreographyLinks, eventKindRestrictedToCompetitors, isGenericEventKind } from "@/lib/event-types";
import { getRehearsalAudience, isRehearsalParticipant } from "@/lib/groups";
import { listedLocationInclude } from "@/lib/locations";
import {
  basicUserSelect,
  formatUserName,
  nestedUserNameOrderBy,
  serializeBasicUser,
  userNameOrderBy,
} from "@/lib/users";
import { getServerTranslator } from "@/i18n/server";
import { isAtLeastManager } from "@/lib/roles";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { isWhatsAppUrl } from "@/lib/whatsapp";

type PageProps = { params: Promise<{ id: string }> };

const statusStyles = {
  AVAILABLE: "text-green-700",
  UNAVAILABLE: "text-red-700",
  MAYBE: "text-amber-700",
} as const;

export default async function EventDetailPage({ params }: PageProps) {
  const [user, t, serverT] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.EventDetail"),
    getServerTranslator(),
  ]);
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  if (!(await canViewEvent(id, user.id))) {
    notFound();
  }

  const canEdit = await canEditEvent(id, user.id);

  const [eventRecord, users] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        ...listedLocationInclude,
        type: {
          select: { id: true, name: true, kind: true, immutable: true, sortOrder: true },
        },
        choreography: { select: { id: true, title: true } },
        group: {
          select: {
            id: true,
            name: true,
            members: { select: { userId: true } },
          },
        },
        choreographies: {
          where: { choreography: { archivedAt: null } },
          include: {
            group: {
              select: {
                id: true,
                name: true,
                _count: { select: { members: true } },
              },
            },
            choreography: {
              select: {
                id: true,
                title: true,
                description: true,
                _count: { select: { members: true, rehearsals: true } },
              },
            },
          },
          orderBy: { choreography: { title: "asc" } },
        },
        participants: {
          include: {
            user: { select: basicUserSelect },
          },
          orderBy: nestedUserNameOrderBy,
        },
        joinRequests: {
          include: {
            user: { select: basicUserSelect },
          },
          orderBy: { requestedAt: "asc" },
        },
        availabilities: {
          include: {
            user: { select: basicUserSelect },
          },
        },
      },
    }),
    canEdit
      ? prisma.user
          .findMany({
            orderBy: userNameOrderBy,
            select: basicUserSelect,
          })
          .then((items) => items.map(serializeBasicUser))
      : Promise.resolve([]),
  ]);

  if (!eventRecord) {
    notFound();
  }

  const event = serializeEvent(
    {
      ...eventRecord,
      hasUpcomingSeriesEvents: hasUpcomingSeriesEvents(
        eventRecord,
        await loadSeriesSiblings([eventRecord]),
      ),
    },
    serverT,
  );
  const generic = isGenericEventKind(event.type.kind);
  const isParticipant = eventRecord.participants.some(
    (participant) => participant.userId === user.id,
  );
  const hasPendingRequest = eventRecord.joinRequests.some(
    (request) => request.userId === user.id,
  );

  const rehearsalAudience =
    event.type.kind === "REHEARSAL"
      ? await getRehearsalAudience(eventRecord)
      : null;
  const canRespondAvailability =
    event.type.kind === "REHEARSAL" &&
    (await isRehearsalParticipant(eventRecord, user.id));
  const canManualAvailabilityCheck = isAtLeastManager(user.role);
  const canViewRehearsalParticipants =
    canRespondAvailability || canEdit || canManualAvailabilityCheck;
  const myResponse = eventRecord.availabilities.find((item) => item.userId === user.id);

  const rehearsalMembers =
    canViewRehearsalParticipants && rehearsalAudience && rehearsalAudience.memberIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: rehearsalAudience.memberIds } },
          select: basicUserSelect,
          orderBy: userNameOrderBy,
        })
      : [];
  const availableParticipantCount = rehearsalMembers.filter((member) =>
    eventRecord.availabilities.some(
      (item) => item.userId === member.id && item.status === "AVAILABLE",
    ),
  ).length;

  const choreographyHref =
    event.type.kind === "REHEARSAL" && event.choreographyId
      ? `/choreographies/${event.choreographyId}`
      : null;

  return (
    <AppShell
      title={
        <>
          <span className="min-w-0">{event.displayTitle}</span>
          {event.type.kind === "DEMONSTRATION" &&
            event.whatsappUrl &&
            isWhatsAppUrl(event.whatsappUrl) && (
              <WhatsAppLink href={event.whatsappUrl} label={t("openWhatsapp")} />
            )}
        </>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {choreographyHref && (
          <Link
            href={choreographyHref}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition",
              "bg-stone-900 text-white hover:bg-stone-700",
            )}
          >
            {t("openChoreography", { title: event.choreographyTitle ?? "" })}
          </Link>
        )}
        <Link href="/events" className="text-sm text-stone-600 hover:text-stone-900">
          {t("backToEvents")}
        </Link>
      </div>

      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-stone-500">
        {event.type.name}
      </p>

      {generic && (
        <div className="mb-6">
          <JoinAsParticipantControls
            joinUrl={`/api/events/${id}/join`}
            requestUrl={`/api/events/${id}/join-requests`}
            allowJoin={eventRecord.allowParticipantJoin}
            allowRequest={eventRecord.allowJoinRequests}
            allowLeave
            isParticipant={isParticipant}
            hasPendingRequest={hasPendingRequest}
            hasUpcomingSeries={event.hasUpcomingSeriesEvents}
          />
        </div>
      )}

      <Card className="mb-6">
        <div className="grid gap-2 text-sm text-stone-600">
          <p>
            <span className="font-medium text-stone-900">{t("start")}:</span>{" "}
            <LocalDateTime value={event.startsAt} />
          </p>
          {event.endsAt && (
            <p>
              <span className="font-medium text-stone-900">{t("end")}:</span>{" "}
              <LocalDateTime value={event.endsAt} />
            </p>
          )}
          {event.location && (
            <p>
              <span className="font-medium text-stone-900">{t("location")}:</span>{" "}
              {event.location}
            </p>
          )}
          {event.choreographyTitle && (
            <p>
              <span className="font-medium text-stone-900">{t("choreography")}:</span>{" "}
              {event.choreographyTitle}
            </p>
          )}
          {event.groupName && (
            <p>
              <span className="font-medium text-stone-900">{t("group")}:</span>{" "}
              {event.groupName}
            </p>
          )}
          {event.description && (
            <p className="whitespace-pre-line">
              <span className="font-medium text-stone-900">{t("description")}:</span>{" "}
              {event.description}
            </p>
          )}
          {event.notes && (
            <p>
              <span className="font-medium text-stone-900">{t("notes")}:</span>{" "}
              {event.notes}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="mt-4">
            <Link
              href={`/events/${id}/edit`}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100",
              )}
            >
              {t("editEvent")}
            </Link>
          </div>
        )}
      </Card>

      {generic && canEdit && (eventRecord.allowJoinRequests || eventRecord.joinRequests.length > 0) && (
        <div className="mb-6">
          <JoinRequestsList
            reviewUrl={`/api/events/${id}/join-requests`}
            requests={eventRecord.joinRequests.map((request) => ({
              id: request.user.id,
              name: serializeBasicUser(request.user).name,
            }))}
          />
        </div>
      )}

      {canRespondAvailability && (
        <Card className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">{t("yourAvailability")}</h2>
          <AvailabilityButtons
            rehearsalId={eventRecord.id}
            currentStatus={myResponse?.status}
          />
        </Card>
      )}

      {event.type.kind === "REHEARSAL" && canViewRehearsalParticipants && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">{t("participantAvailability")}</h2>
          {canManualAvailabilityCheck && (
            <div className="mb-4">
              <ManualAvailabilityCheckButton eventId={eventRecord.id} />
            </div>
          )}
          {rehearsalMembers.length > 0 && (
            <p className="mb-3 text-sm text-stone-700">
              {t("availableParticipantCount", {
                available: availableParticipantCount,
                total: rehearsalMembers.length,
              })}
            </p>
          )}
          <div className="space-y-3">
            {rehearsalMembers.length === 0 ? (
              <p className="text-sm text-stone-600">{t("noParticipantsAssigned")}</p>
            ) : (
              rehearsalMembers.map((member) => {
                const response = eventRecord.availabilities.find(
                  (item) => item.userId === member.id,
                );
                return (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{formatUserName(member)}</p>
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        response ? statusStyles[response.status] : "text-stone-400"
                      }`}
                    >
                      {response
                        ? t(`availabilityStatus.${response.status}`)
                        : t("availabilityStatus.noResponse")}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {eventKindAllowsChoreographyLinks(event.type.kind) && (
        <div className="mb-6">
          <RepresentationChoreographiesSection
            representationId={id}
            canEdit={canEdit}
            description={
              event.type.kind === "DEMONSTRATION"
                ? t("demonstrationPieces")
                : t("representationPieces")
            }
            allowGroup={event.type.kind === "DEMONSTRATION"}
            choreographies={eventRecord.choreographies.map((link) => ({
              id: link.choreography.id,
              title: link.choreography.title,
              description: link.choreography.description,
              memberCount: link.group ? link.group._count.members : link.choreography._count.members,
              rehearsalCount: link.choreography._count.rehearsals,
              groupName: link.group?.name ?? null,
            }))}
          />
        </div>
      )}

      {generic && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("participants")}</h2>
          <EventParticipantsList
            eventId={id}
            participants={event.participants}
            canEdit={canEdit}
          />
          {canEdit && (
            <div className="mt-6 border-t border-stone-100 pt-6">
              <AssignEventParticipantForm
                eventId={id}
                users={
                  eventKindRestrictedToCompetitors(event.type.kind)
                    ? users.filter((candidate) => candidate.isCompetitor)
                    : users
                }
                assignedUserIds={event.participants.map((p) => p.id)}
              />
            </div>
          )}
        </Card>
      )}

    </AppShell>
  );
}
