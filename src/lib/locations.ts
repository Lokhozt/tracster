import { prisma } from "@/lib/db";

export const listedLocationInclude = {
  listedLocation: { select: { id: true, name: true } },
} as const;

export type LocationRecord = {
  id: string;
  name: string;
};

export type LocationAssignment = {
  locationId: string | null;
  location: string | null;
};

export function assignmentFromInput(input: {
  locationId?: string | null;
  location?: string | null;
}): LocationAssignment {
  return {
    locationId: input.locationId || null,
    location: input.location?.trim() || null,
  };
}

export type LocationFields = {
  locationId?: string | null;
  location?: string | null;
  listedLocation?: { id?: string; name: string } | null;
};

export function displayLocation(record: LocationFields): string | null {
  return record.listedLocation?.name ?? record.location ?? null;
}

export async function findLocationByName(name: string, excludeId?: string) {
  return prisma.location.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function resolveLocationFromParsed(input: {
  locationId?: string | null;
  location?: string | null;
}): Promise<LocationAssignment | { error: string }> {
  return resolveLocationAssignment(assignmentFromInput(input));
}

export async function resolveLocationAssignment(
  input: LocationAssignment,
): Promise<LocationAssignment | { error: string }> {
  if (input.locationId && input.location) {
    return { error: "Choose a listed location or a unique location, not both." };
  }

  if (input.locationId) {
    const listed = await prisma.location.findUnique({
      where: { id: input.locationId },
      select: { id: true },
    });

    if (!listed) {
      return { error: "Selected location was not found." };
    }

    return { locationId: listed.id, location: null };
  }

  return {
    locationId: null,
    location: input.location,
  };
}

export async function snapshotLocationUsage(locationId: string, name: string) {
  await prisma.$transaction([
    prisma.repetitionEvent.updateMany({
      where: { locationId },
      data: { location: name, locationId: null },
    }),
    prisma.representation.updateMany({
      where: { locationId },
      data: { location: name, locationId: null },
    }),
    prisma.event.updateMany({
      where: { locationId },
      data: { location: name, locationId: null },
    }),
  ]);
}
