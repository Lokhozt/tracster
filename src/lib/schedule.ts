import { listedChoreographyWhere, listedEventWhere } from "@/lib/participation";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { prisma } from "@/lib/db";
import { canEditEvent } from "@/lib/events";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { canEditChoreography } from "@/lib/permissions";
import { canEditRepresentation } from "@/lib/representations";
import { hasGlobalAccess } from "@/lib/roles";

const choreographyAccessFilter = (userId: string) => listedChoreographyWhere(userId);

function involvedInChoreographyWhere(userId: string) {
  return {
    archivedAt: null,
    OR: [
      { createdById: userId },
      { choreographers: { some: { userId } } },
      { members: { some: { userId } } },
    ],
  };
}

export type ScheduleEventType = "repetition" | "representation" | "event";

export type SerializedScheduleEvent = {
  id: string;
  type: ScheduleEventType;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  choreographyId: string | null;
  choreographyTitle: string | null;
  isMember: boolean;
  isParticipating: boolean;
  availabilityStatus: "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | null;
  href: string;
  canEdit: boolean;
};

export async function getUserScheduleEvents(userId: string) {
  const globalAccess = await hasGlobalAccess(userId);
  const choreographyWhere = {
    choreography: globalAccess ? visibleChoreographyWhere : choreographyAccessFilter(userId),
  };

  const eventWhere = globalAccess ? undefined : listedEventWhere(userId);

  const representationWhere = globalAccess
    ? undefined
    : {
        choreographies: {
          some: {
            choreography: involvedInChoreographyWhere(userId),
          },
        },
      };

  const [repetitions, representations, associationEvents] = await Promise.all([
    prisma.repetitionEvent.findMany({
      where: choreographyWhere,
      include: {
        ...listedLocationInclude,
        choreography: {
          select: {
            id: true,
            title: true,
            members: {
              where: { userId },
              select: { userId: true },
            },
          },
        },
        group: {
          select: {
            members: {
              where: { userId },
              select: { userId: true },
            },
          },
        },
        availabilities: {
          where: { userId },
          select: { status: true },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.representation.findMany({
      where: representationWhere,
      include: {
        ...listedLocationInclude,
        choreographies: {
          select: {
            choreography: {
              select: {
                createdById: true,
                members: {
                  where: { userId },
                  select: { userId: true },
                },
                choreographers: {
                  where: { userId },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.event.findMany({
      where: eventWhere,
      include: {
        ...listedLocationInclude,
        participants: {
          where: { userId },
          select: { userId: true },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const events: SerializedScheduleEvent[] = await Promise.all([
    ...repetitions.map(async (repetition) => ({
      id: repetition.id,
      type: "repetition" as const,
      title: repetition.title,
      startsAt: repetition.startsAt.toISOString(),
      endsAt: repetition.endsAt?.toISOString() ?? null,
      location: displayLocation(repetition),
      choreographyId: repetition.choreographyId,
      choreographyTitle: repetition.choreography.title,
      isMember: repetition.group
        ? repetition.group.members.length > 0
        : repetition.choreography.members.length > 0,
      isParticipating: repetition.group
        ? repetition.group.members.length > 0
        : repetition.choreography.members.length > 0,
      availabilityStatus: repetition.availabilities[0]?.status ?? null,
      href: `/repetitions/${repetition.id}`,
      canEdit: await canEditChoreography(repetition.choreographyId, userId),
    })),
    ...representations.map(async (representation) => {
      const involved = representation.choreographies.some(({ choreography }) => {
        return (
          choreography.createdById === userId ||
          choreography.choreographers.length > 0 ||
          choreography.members.length > 0
        );
      });

      return {
        id: representation.id,
        type: "representation" as const,
        title: representation.title,
        startsAt: representation.startsAt.toISOString(),
        endsAt: representation.endsAt?.toISOString() ?? null,
        location: displayLocation(representation),
        choreographyId: null,
        choreographyTitle: null,
        isMember: involved,
        isParticipating: involved,
        availabilityStatus: null,
        href: `/representations/${representation.id}`,
        canEdit: await canEditRepresentation(representation.id, userId),
      };
    }),
    ...associationEvents.map(async (event) => ({
      id: event.id,
      type: "event" as const,
      title: event.title,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      location: displayLocation(event),
      choreographyId: null,
      choreographyTitle: null,
      isMember: event.participants.length > 0,
      isParticipating:
        event.participants.length > 0 || event.createdById === userId,
      availabilityStatus: null,
      href: `/events/${event.id}`,
      canEdit: await canEditEvent(event.id, userId),
    })),
  ]);

  return events.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function getUpcomingScheduleEvents(events: SerializedScheduleEvent[]) {
  const now = new Date();
  return events.filter((event) => new Date(event.startsAt) >= now);
}
