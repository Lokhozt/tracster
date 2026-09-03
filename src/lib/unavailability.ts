import { prisma } from "@/lib/db";

export type SerializedUnavailability = {
  id: string;
  startsAt: string;
  endsAt: string;
};

export function serializeUnavailability(
  entry: {
    id: string;
    startsAt: Date;
    endsAt: Date;
  },
): SerializedUnavailability {
  return {
    id: entry.id,
    startsAt: entry.startsAt.toISOString(),
    endsAt: entry.endsAt.toISOString(),
  };
}

export async function getUserUnavailabilityInRange(
  userId: string,
  from: Date,
  to: Date,
) {
  return prisma.userUnavailability.findMany({
    where: {
      userId,
      startsAt: { lt: to },
      endsAt: { gt: from },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getOwnedUnavailability(id: string, userId: string) {
  return prisma.userUnavailability.findFirst({
    where: { id, userId },
  });
}

export function validateUnavailabilityRange(startsAt: Date, endsAt: Date): string | null {
  if (endsAt <= startsAt) {
    return "End time must be after start time.";
  }

  const durationMs = endsAt.getTime() - startsAt.getTime();
  const thirtyMinutesMs = 30 * 60 * 1000;

  if (durationMs < thirtyMinutesMs) {
    return "Unavailability must be at least 30 minutes.";
  }

  return null;
}

export async function saveMergedUnavailability(
  userId: string,
  startsAt: Date,
  endsAt: Date,
  existingId?: string,
) {
  return prisma.$transaction(async (tx) => {
    let mergedStart = startsAt;
    let mergedEnd = endsAt;
    const absorbedIds = new Set<string>();

    while (true) {
      const excludedIds = existingId ? [existingId, ...absorbedIds] : [...absorbedIds];
      // Periods that merely touch are left alone: a whole day and the whole day
      // after it are separate periods, so each keeps its own block in the
      // calendar and can be cleared on its own.
      const overlapping = await tx.userUnavailability.findMany({
        where: {
          userId,
          ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
          startsAt: { lt: mergedEnd },
          endsAt: { gt: mergedStart },
        },
      });

      if (overlapping.length === 0) {
        break;
      }

      for (const entry of overlapping) {
        absorbedIds.add(entry.id);
        if (entry.startsAt < mergedStart) {
          mergedStart = entry.startsAt;
        }
        if (entry.endsAt > mergedEnd) {
          mergedEnd = entry.endsAt;
        }
      }
    }

    const deletedIds = [...absorbedIds];
    if (deletedIds.length > 0) {
      await tx.userUnavailability.deleteMany({
        where: { userId, id: { in: deletedIds } },
      });
    }

    if (existingId) {
      const entry = await tx.userUnavailability.update({
        where: { id: existingId },
        data: {
          startsAt: mergedStart,
          endsAt: mergedEnd,
        },
      });
      return { entry, deletedIds };
    }

    const entry = await tx.userUnavailability.create({
      data: {
        userId,
        startsAt: mergedStart,
        endsAt: mergedEnd,
      },
    });
    return { entry, deletedIds };
  });
}
