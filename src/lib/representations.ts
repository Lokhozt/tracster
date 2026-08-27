import { listedChoreographyWhere } from "@/lib/participation";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { prisma } from "@/lib/db";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { canEditEvent, canViewEvent } from "@/lib/events";
import { canEditChoreography } from "@/lib/permissions";
import { hasGlobalAccess } from "@/lib/roles";

const choreographyAccessFilter = (userId: string) => listedChoreographyWhere(userId);

const representationTypeWhere = {
  type: { kind: "REPRESENTATION" as const },
};

export async function canViewRepresentation(eventId: string, userId: string) {
  return canViewEvent(eventId, userId);
}

export async function canEditRepresentation(eventId: string, userId: string) {
  return canEditEvent(eventId, userId);
}

export async function getUserRepresentations(userId: string) {
  const globalAccess = await hasGlobalAccess(userId);

  return prisma.event.findMany({
    where: {
      ...representationTypeWhere,
      ...(globalAccess
        ? {}
        : {
            OR: [
              { createdById: userId },
              {
                choreographies: {
                  some: {
                    choreography: choreographyAccessFilter(userId),
                  },
                },
              },
            ],
          }),
    },
    include: {
      ...listedLocationInclude,
      type: { select: { id: true, name: true, kind: true } },
      choreographies: {
        where: { choreography: visibleChoreographyWhere },
        include: {
          choreography: { select: { id: true, title: true } },
        },
        orderBy: { choreography: { title: "asc" } },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getLinkableRepresentations(
  userId: string,
  choreographyId: string,
) {
  const globalAccess = await hasGlobalAccess(userId);

  const linkedIds = await prisma.eventChoreography.findMany({
    where: { choreographyId },
    select: { eventId: true },
  });

  const excludeIds = linkedIds.map((item) => item.eventId);

  const representations = await prisma.event.findMany({
    where: {
      ...representationTypeWhere,
      id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
      ...(globalAccess
        ? {}
        : {
            OR: [
              { createdById: userId },
              {
                choreographies: {
                  some: {
                    choreography: choreographyAccessFilter(userId),
                  },
                },
              },
            ],
          }),
    },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true,
      listedLocation: { select: { name: true } },
    },
  });

  return representations.map((representation) => ({
    id: representation.id,
    title: representation.title,
    startsAt: representation.startsAt,
    endsAt: representation.endsAt,
    location: displayLocation(representation),
  }));
}

export async function getLinkableChoreographies(userId: string, eventId: string) {
  const globalAccess = await hasGlobalAccess(userId);

  const linkedIds = await prisma.eventChoreography.findMany({
    where: { eventId },
    select: { choreographyId: true },
  });

  const excludeIds = linkedIds.map((item) => item.choreographyId);

  return prisma.choreography.findMany({
    where: {
      id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
      archivedAt: null,
      ...(globalAccess
        ? {}
        : {
            OR: [
              { createdById: userId },
              { choreographers: { some: { userId } } },
            ],
          }),
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export type SerializedRepresentation = {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  locationId: string | null;
  notes: string | null;
  choreographies: { id: string; title: string }[];
};

export function serializeRepresentation(
  representation: Awaited<ReturnType<typeof getUserRepresentations>>[number],
): SerializedRepresentation {
  return {
    id: representation.id,
    title: representation.title || null,
    startsAt: representation.startsAt.toISOString(),
    endsAt: representation.endsAt?.toISOString() ?? null,
    location: displayLocation(representation),
    locationId: representation.locationId,
    notes: representation.notes,
    choreographies: representation.choreographies.map((link) => ({
      id: link.choreography.id,
      title: link.choreography.title,
    })),
  };
}

export async function assertRepresentationEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, type: { select: { kind: true } } },
  });

  if (!event || event.type.kind !== "REPRESENTATION") {
    return null;
  }

  return event;
}

export { canEditChoreography };
