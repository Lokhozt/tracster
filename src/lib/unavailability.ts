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
