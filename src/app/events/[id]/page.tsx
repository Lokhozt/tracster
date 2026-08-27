import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AvailabilityButtons } from "@/components/AvailabilityButtons";
import {
  AssignEventParticipantForm,
  EditEventForm,
  EventParticipantsList,
} from "@/components/EventForms";
import { JoinAsParticipantControls } from "@/components/JoinAsParticipantControls";
import { JoinRequestsList } from "@/components/JoinRequestsList";
import { RepresentationChoreographiesSection } from "@/components/RepresentationForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { canEditEvent, canViewEvent, serializeEvent } from "@/lib/events";
import { getEventTypes, eventKindAllowsChoreographyLinks, isGenericEventKind } from "@/lib/event-types";
import { getRepetitionAudience, isRepetitionParticipant } from "@/lib/groups";
import { listedLocationInclude } from "@/lib/locations";
import { canEditChoreography } from "@/lib/permissions";
import { basicUserSelect, formatUserName, serializeBasicUser } from "@/lib/users";

type PageProps = { params: Promise<{ id: string }> };

const statusStyles = {
  AVAILABLE: "text-green-700",
  UNAVAILABLE: "text-red-700",
  MAYBE: "text-amber-700",
} as const;

export default async function EventDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  if (!(await canViewEvent(id, user.id))) {
    notFound();
  }

  const canEdit = await canEditEvent(id, user.id);
  const eventTypes = await getEventTypes();

  const [eventRecord, users, choreographyOptions] = await Promise.all([
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
            choreography: {
              select: {
                id: true,
                title: true,
                description: true,
                _count: { select: { members: true, repetitions: true } },
              },
            },
          },
          orderBy: { choreography: { title: "asc" } },
        },
        participants: {
          include: {
            user: { select: basicUserSelect },
          },
          orderBy: { user: { lastName: "asc" } },
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
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            select: basicUserSelect,
          })
          .then((items) => items.map(serializeBasicUser))
      : Promise.resolve([]),
    canEdit
      ? prisma.choreography.findMany({
          where: { archivedAt: null },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
  ]);

  if (!eventRecord) {
    notFound();
  }

  const event = serializeEvent(eventRecord);
  const generic = isGenericEventKind(event.type.kind);
  const isParticipant = eventRecord.participants.some(
    (participant) => participant.userId === user.id,
  );
  const hasPendingRequest = eventRecord.joinRequests.some(
    (request) => request.userId === user.id,
  );

  const repetitionAudience =
    event.type.kind === "REPETITION"
      ? await getRepetitionAudience(eventRecord)
      : null;
  const canRespondAvailability =
    event.type.kind === "REPETITION" &&
    (await isRepetitionParticipant(eventRecord, user.id));
  const myResponse = eventRecord.availabilities.find((item) => item.userId === user.id);

  const repetitionMembers =
    event.type.kind === "REPETITION" && repetitionAudience && repetitionAudience.memberIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: repetitionAudience.memberIds } },
          select: basicUserSelect,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
      : [];

  const editableChoreographies = (
    await Promise.all(
      choreographyOptions.map(async (choreography) =>
        (await canEditChoreography(choreography.id, user.id)) ? choreography : null,
      ),
    )
  ).filter((item) => item !== null);

  const backHref =
    event.type.kind === "REPETITION" && event.choreographyId
      ? `/choreographies/${event.choreographyId}`
      : "/events";
  const backLabel =
    event.type.kind === "REPETITION" && event.choreographyTitle
      ? `← Back to ${event.choreographyTitle}`
      : "← Back to events";

  return (
    <AppShell title={event.displayTitle}>
      <div className="mb-6">
        <Link href={backHref} className="text-sm text-stone-600 hover:text-stone-900">
          {backLabel}
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
            isParticipant={isParticipant}
            hasPendingRequest={hasPendingRequest}
          />
        </div>
      )}

      <Card className="mb-6">
        <div className="grid gap-2 text-sm text-stone-600">
          <p>
            <span className="font-medium text-stone-900">Start:</span>{" "}
            {formatDateTime(new Date(event.startsAt))}
          </p>
          {event.endsAt && (
            <p>
              <span className="font-medium text-stone-900">End:</span>{" "}
              {formatDateTime(new Date(event.endsAt))}
            </p>
          )}
          {event.location && (
            <p>
              <span className="font-medium text-stone-900">Location:</span>{" "}
              {event.location}
            </p>
          )}
          {event.choreographyTitle && (
            <p>
              <span className="font-medium text-stone-900">Choreography:</span>{" "}
              {event.choreographyTitle}
            </p>
          )}
          {event.groupName && (
            <p>
              <span className="font-medium text-stone-900">Group:</span> {event.groupName}
            </p>
          )}
          {event.description && (
            <p>
              <span className="font-medium text-stone-900">Description:</span>{" "}
              {event.description}
            </p>
          )}
          {event.notes && (
            <p>
              <span className="font-medium text-stone-900">Notes:</span> {event.notes}
            </p>
          )}
        </div>
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
          <h2 className="mb-3 text-lg font-semibold">Your availability</h2>
          <AvailabilityButtons
            repetitionId={eventRecord.id}
            currentStatus={myResponse?.status}
          />
        </Card>
      )}

      {event.type.kind === "REPETITION" && canEdit && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Participant availability</h2>
          <div className="space-y-3">
            {repetitionMembers.length === 0 ? (
              <p className="text-sm text-stone-600">No participants assigned yet.</p>
            ) : (
              repetitionMembers.map((member) => {
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
                      {response?.status ?? "No response"}
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
                ? "Pieces shown in this demonstration."
                : "Pieces performed in this representation."
            }
            choreographies={eventRecord.choreographies.map((link) => ({
              id: link.choreography.id,
              title: link.choreography.title,
              description: link.choreography.description,
              memberCount: link.choreography._count.members,
              repetitionCount: link.choreography._count.repetitions,
            }))}
          />
        </div>
      )}

      {generic && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Participants</h2>
          <EventParticipantsList
            eventId={id}
            participants={event.participants}
            canEdit={canEdit}
          />
          {canEdit && (
            <div className="mt-6 border-t border-stone-100 pt-6">
              <AssignEventParticipantForm
                eventId={id}
                users={users}
                assignedUserIds={event.participants.map((p) => p.id)}
              />
            </div>
          )}
        </Card>
      )}

      {canEdit && (
        <Card className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Edit event</h2>
          <EditEventForm
            event={event}
            eventTypes={eventTypes}
            choreographyOptions={editableChoreographies}
          />
        </Card>
      )}
    </AppShell>
  );
}
