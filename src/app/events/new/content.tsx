import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { CreateRouteContent } from "@/components/RouteSheet";
import { CreateEventForm } from "@/components/EventForms";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventTypeByKind, getEventTypes, eventKindSkipsGenericCreatePermission } from "@/lib/event-types";
import { canCreateEvent } from "@/lib/site-settings";
import { basicUserSelect, serializeBasicUser, userNameOrderBy } from "@/lib/users";
import { canEditChoreography } from "@/lib/permissions";
import { hasGlobalAccess } from "@/lib/roles";
import {
  filterEventTypesForViewer,
  type EventKind,
} from "@/lib/event-type-helpers";
import { loadEventCreateCopy } from "@/lib/event-create-copy";

export type NewEventSearchParams = { type?: string; choreographyId?: string; copyFrom?: string };

const kindAliases: Record<string, EventKind> = {
  event: "EVENT",
  rehearsal: "REHEARSAL",
  repetition: "REHEARSAL",
  representation: "REPRESENTATION",
  competition: "COMPETITION",
  demonstration: "DEMONSTRATION",
  festival: "FESTIVAL",
  training: "TRAINING",
  party: "PARTY",
  soiree: "PARTY",
};

export async function newEventContent(
  searchParams: Promise<NewEventSearchParams>,
): Promise<CreateRouteContent> {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.NewEvent"),
  ]);
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const [eventTypes, seesAllEvents] = await Promise.all([
    getEventTypes(),
    hasGlobalAccess(user.id),
  ]);
  const visibleEventTypes = filterEventTypesForViewer(eventTypes, {
    isCompetitor: user.isCompetitor,
    seesAllEvents,
  });
  const requestedKind = params.type ? kindAliases[params.type.toLowerCase()] : undefined;
  const requestedType =
    (params.type ? visibleEventTypes.find((type) => type.id === params.type) : undefined) ??
    (requestedKind && visibleEventTypes.some((type) => type.kind === requestedKind)
      ? await getEventTypeByKind(requestedKind)
      : undefined);

  const copyFrom = params.copyFrom
    ? (await loadEventCreateCopy(params.copyFrom, user.id)) ?? undefined
    : undefined;

  const needsGenericCreate = !eventKindSkipsGenericCreatePermission(
    requestedType?.kind ?? null,
  );
  if (!copyFrom && needsGenericCreate && !(await canCreateEvent(user.id))) {
    redirect("/");
  }

  const [users, choreographies] = await Promise.all([
    prisma.user.findMany({
      orderBy: userNameOrderBy,
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

  return {
    title: t("title"),
    form: (
      <CreateEventForm
        eventTypes={visibleEventTypes}
        participantOptions={users.map(serializeBasicUser)}
        choreographyOptions={editableChoreographies}
        defaultTypeId={requestedType?.id}
        lockType={Boolean(requestedType) && Boolean(params.type) && !copyFrom}
        defaultChoreographyId={lockChoreography ? params.choreographyId : undefined}
        lockChoreography={lockChoreography}
        copyFrom={copyFrom}
        redirectBasePath="/events"
      />
    ),
  };
}
