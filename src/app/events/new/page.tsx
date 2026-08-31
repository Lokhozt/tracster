import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateEventForm } from "@/components/EventForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventTypeByKind, getEventTypes, eventKindSkipsGenericCreatePermission } from "@/lib/event-types";
import { canCreateEvent } from "@/lib/site-settings";
import { basicUserSelect, serializeBasicUser } from "@/lib/users";
import { canEditChoreography } from "@/lib/permissions";
import type { EventKind } from "@/lib/event-type-helpers";

type PageProps = {
  searchParams: Promise<{ type?: string; choreographyId?: string }>;
};

const kindAliases: Record<string, EventKind> = {
  event: "EVENT",
  rehearsal: "REHEARSAL",
  repetition: "REHEARSAL",
  representation: "REPRESENTATION",
  competition: "COMPETITION",
  demonstration: "DEMONSTRATION",
  festival: "FESTIVAL",
};

export default async function NewEventPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const eventTypes = await getEventTypes();
  const requestedKind = params.type ? kindAliases[params.type.toLowerCase()] : undefined;
  const requestedType =
    (params.type ? eventTypes.find((type) => type.id === params.type) : undefined) ??
    (requestedKind ? await getEventTypeByKind(requestedKind) : undefined);

  const needsGenericCreate = !eventKindSkipsGenericCreatePermission(requestedType?.kind ?? null);
  if (needsGenericCreate && !(await canCreateEvent(user.id))) {
    redirect("/events");
  }

  const [users, choreographies] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: basicUserSelect,
    }),
    prisma.choreography.findMany({
      where: { archivedAt: null },
      select: { id: true, title: true, createdById: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const editableChoreographies = (
    await Promise.all(
      choreographies.map(async (choreography) =>
        (await canEditChoreography(choreography.id, user.id))
          ? { id: choreography.id, title: choreography.title }
          : null,
      ),
    )
  ).filter((item) => item !== null);

  const lockChoreography = Boolean(
    params.choreographyId &&
      editableChoreographies.some((item) => item.id === params.choreographyId),
  );

  return (
    <AppShell title="New event">
      <Card className="max-w-xl">
        <CreateEventForm
          eventTypes={eventTypes}
          participantOptions={users.map(serializeBasicUser)}
          choreographyOptions={editableChoreographies}
          defaultTypeId={requestedType?.id}
          lockType={Boolean(requestedType) && Boolean(params.type)}
          defaultChoreographyId={lockChoreography ? params.choreographyId : undefined}
          lockChoreography={lockChoreography}
          redirectBasePath="/events"
        />
      </Card>
    </AppShell>
  );
}
