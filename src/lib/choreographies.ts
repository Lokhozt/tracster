import { prisma } from "@/lib/db";
import type { UpcomingChoreographyImpact } from "@/lib/choreography-lifecycle";

export const visibleChoreographyWhere = { archivedAt: null };

export async function getActiveChoreographyForAdmin(choreographyId: string) {
  return prisma.choreography.findFirst({
    where: { id: choreographyId, archivedAt: null },
    select: { id: true, title: true },
  });
}

export function serializeUpcomingImpact(impact: UpcomingChoreographyImpact) {
  return {
    repetitions: impact.repetitions.map((item) => ({
      id: item.id,
      title: item.title,
      startsAt: item.startsAt.toISOString(),
    })),
    representations: impact.representations.map((item) => ({
      id: item.id,
      title: item.title,
      startsAt: item.startsAt.toISOString(),
    })),
  };
}

export async function getUpcomingChoreographyImpact(
  choreographyId: string,
  now = new Date(),
): Promise<UpcomingChoreographyImpact> {
  const [repetitions, links] = await Promise.all([
    prisma.repetitionEvent.findMany({
      where: { choreographyId, startsAt: { gte: now } },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.choreographyRepresentation.findMany({
      where: {
        choreographyId,
        representation: { startsAt: { gte: now } },
      },
      select: {
        representation: { select: { id: true, title: true, startsAt: true } },
      },
      orderBy: { representation: { startsAt: "asc" } },
    }),
  ]);

  return {
    repetitions,
    representations: links.map((link) => link.representation),
  };
}

export async function archiveChoreography(choreographyId: string) {
  const now = new Date();

  await prisma.$transaction([
    prisma.repetitionEvent.deleteMany({
      where: { choreographyId, startsAt: { gte: now } },
    }),
    prisma.choreographyRepresentation.deleteMany({
      where: {
        choreographyId,
        representation: { startsAt: { gte: now } },
      },
    }),
    prisma.choreography.update({
      where: { id: choreographyId },
      data: { archivedAt: now },
    }),
  ]);
}

export async function deleteChoreography(choreographyId: string) {
  const now = new Date();

  await prisma.$transaction([
    prisma.repetitionEvent.deleteMany({
      where: { choreographyId, startsAt: { gte: now } },
    }),
    prisma.choreographyRepresentation.deleteMany({
      where: {
        choreographyId,
        representation: { startsAt: { gte: now } },
      },
    }),
    prisma.choreography.delete({ where: { id: choreographyId } }),
  ]);
}
