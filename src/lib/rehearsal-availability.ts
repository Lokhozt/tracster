import { prisma } from "@/lib/db";
import { intervalsOverlap, resolveIntervalEnd } from "@/lib/conflicts";
import { getRehearsalAudience } from "@/lib/groups";
import type { AvailabilityStatus } from "@/generated/prisma/client";

export async function syncRehearsalAvailabilityFromUnavailability(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      startsAt: true,
      endsAt: true,
      choreographyId: true,
      groupId: true,
      type: { select: { kind: true } },
      group: {
        select: {
          name: true,
          members: { select: { userId: true } },
        },
      },
    },
  });

  if (!event || event.type.kind !== "REHEARSAL") {
    return null;
  }

  const audience = await getRehearsalAudience(event);
  const memberIds = [...new Set(audience.memberIds)];
  if (memberIds.length === 0) {
    return { updated: 0 };
  }

  const rangeStart = event.startsAt;
  const rangeEnd = resolveIntervalEnd(event.startsAt, event.endsAt);
  const unavailability = await prisma.userUnavailability.findMany({
    where: {
      userId: { in: memberIds },
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
    },
    select: { userId: true, startsAt: true, endsAt: true },
  });

  const respondedAt = new Date();
  await prisma.$transaction(
    memberIds.map((userId) => {
      const status: AvailabilityStatus = unavailability.some(
        (entry) =>
          entry.userId === userId &&
          intervalsOverlap(rangeStart, rangeEnd, entry.startsAt, entry.endsAt),
      )
        ? "UNAVAILABLE"
        : "AVAILABLE";

      return prisma.availabilityResponse.upsert({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
        update: { status, respondedAt },
        create: {
          eventId,
          userId,
          status,
          respondedAt,
        },
      });
    }),
  );

  return { updated: memberIds.length };
}
