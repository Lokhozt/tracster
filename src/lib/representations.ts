import { listedChoreographyWhere } from "@/lib/participation";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { prisma } from "@/lib/db";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { hasGlobalAccess } from "@/lib/roles";

const choreographyAccessFilter = (userId: string) => listedChoreographyWhere(userId);

export async function canViewRepresentation(
  representationId: string,
  userId: string,
): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const representation = await prisma.representation.findUnique({
    where: { id: representationId },
    select: {
      createdById: true,
      choreographies: {
        select: { choreographyId: true },
      },
    },
  });

  if (!representation) {
    return false;
  }

  if (representation.createdById === userId) {
    return true;
  }

  for (const link of representation.choreographies) {
    if (await canViewChoreography(link.choreographyId, userId)) {
      return true;
    }
  }

  return false;
}

export async function canEditRepresentation(
  representationId: string,
  userId: string,
): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const representation = await prisma.representation.findUnique({
    where: { id: representationId },
    select: {
      createdById: true,
      choreographies: {
        select: { choreographyId: true },
      },
    },
  });

  if (!representation) {
    return false;
  }

  if (representation.createdById === userId) {
    return true;
  }

  for (const link of representation.choreographies) {
    if (await canEditChoreography(link.choreographyId, userId)) {
      return true;
    }
  }

  return false;
}

export async function getUserRepresentations(userId: string) {
  const globalAccess = await hasGlobalAccess(userId);

  return prisma.representation.findMany({
    where: globalAccess
      ? undefined
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
        },
    include: {
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

  const linkedIds = await prisma.choreographyRepresentation.findMany({
    where: { choreographyId },
    select: { representationId: true },
  });

  const excludeIds = linkedIds.map((item) => item.representationId);

  return prisma.representation.findMany({
    where: {
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
    },
  });
}

export async function getLinkableChoreographies(
  userId: string,
  representationId: string,
) {
  const globalAccess = await hasGlobalAccess(userId);

  const linkedIds = await prisma.choreographyRepresentation.findMany({
    where: { representationId },
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
  notes: string | null;
  choreographies: { id: string; title: string }[];
};

export function serializeRepresentation(
  representation: Awaited<ReturnType<typeof getUserRepresentations>>[number],
): SerializedRepresentation {
  return {
    id: representation.id,
    title: representation.title,
    startsAt: representation.startsAt.toISOString(),
    endsAt: representation.endsAt?.toISOString() ?? null,
    location: representation.location,
    notes: representation.notes,
    choreographies: representation.choreographies.map((link) => ({
      id: link.choreography.id,
      title: link.choreography.title,
    })),
  };
}
