import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  AssignEventParticipantForm,
  EditEventForm,
  EventParticipantsList,
} from "@/components/EventForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { canEditEvent, canViewEvent, serializeEvent } from "@/lib/events";
import { basicUserSelect, serializeBasicUser } from "@/lib/users";

type PageProps = { params: Promise<{ id: string }> };

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

  const [eventRecord, users] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: { select: basicUserSelect },
          },
          orderBy: { user: { lastName: "asc" } },
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
  ]);

  if (!eventRecord) {
    notFound();
  }

  const event = serializeEvent(eventRecord);

  return (
    <AppShell title={event.title}>
      <div className="mb-6">
        <Link href="/events" className="text-sm text-stone-600 hover:text-stone-900">
          ← Back to events
        </Link>
      </div>

      {canEdit ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Edit event</h2>
          <EditEventForm event={event} />
        </Card>
      ) : (
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
            {event.description && (
              <p>
                <span className="font-medium text-stone-900">Description:</span>{" "}
                {event.description}
              </p>
            )}
          </div>
        </Card>
      )}

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
    </AppShell>
  );
}
