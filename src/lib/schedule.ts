import { prisma } from "@/lib/db";
import { canEditEvent } from "@/lib/events";
import { canEditChoreography } from "@/lib/permissions";
import { canEditRepresentation } from "@/lib/representations";
import { hasGlobalAccess } from "@/lib/roles";

const choreographyAccessFilter = (userId: string) => ({
  OR: [
    { createdById: userId },
    { choreographers: { some: { userId } } },
    { members: { some: { userId } } },
  ],
});

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
  const choreographyWhere = globalAccess
    ? undefined
    : { choreography: choreographyAccessFilter(userId) };

  const eventWhere = globalAccess
    ? undefined
    : {
        OR: [
          { createdById: userId },
          { participants: { some: { userId } } },
        ],
      };

  const [repetitions, representationLinks, associationEvents] = await Promise.all([
    prisma.repetitionEvent.findMany({
      where: choreographyWhere,
      include: {
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
        availabilities: {
          where: { userId },
          select: { status: true },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.choreographyRepresentation.findMany({
      where: choreographyWhere,
      include: {
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
        representation: true,
      },
      orderBy: { representation: { startsAt: "asc" } },
    }),
    prisma.event.findMany({
      where: eventWhere,
      include: {
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
      location: repetition.location,
      choreographyId: repetition.choreographyId,
      choreographyTitle: repetition.choreography.title,
      isMember: repetition.choreography.members.length > 0,
      isParticipating: repetition.choreography.members.length > 0,
      availabilityStatus: repetition.availabilities[0]?.status ?? null,
      href: `/repetitions/${repetition.id}`,
      canEdit: await canEditChoreography(repetition.choreographyId, userId),
    })),
    ...representationLinks.map(async (link) => ({
      id: `${link.representationId}-${link.choreographyId}`,
      type: "representation" as const,
      title: link.representation.title,
      startsAt: link.representation.startsAt.toISOString(),
      endsAt: link.representation.endsAt?.toISOString() ?? null,
      location: link.representation.location,
      choreographyId: link.choreographyId,
      choreographyTitle: link.choreography.title,
      isMember: link.choreography.members.length > 0,
      isParticipating: link.choreography.members.length > 0,
      availabilityStatus: null,
      href: `/representations/${link.representationId}`,
      canEdit: await canEditRepresentation(link.representationId, userId),
    })),
    ...associationEvents.map(async (event) => ({
      id: event.id,
      type: "event" as const,
      title: event.title,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      location: event.location,
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
