import { prisma } from "@/lib/db";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";
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
    rehearsals: impact.rehearsals.map((item) => ({
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
  const [rehearsals, links] = await Promise.all([
    prisma.event.findMany({
      where: {
        choreographyId,
        type: { kind: "REHEARSAL" },
        startsAt: { gte: now },
      },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.eventChoreography.findMany({
      where: {
        choreographyId,
        event: { startsAt: { gte: now } },
      },
      select: {
        event: { select: { id: true, title: true, startsAt: true } },
      },
      orderBy: { event: { startsAt: "asc" } },
    }),
  ]);

  return {
    rehearsals,
    representations: links.map((link) => link.event),
  };
}

export async function archiveChoreography(choreographyId: string) {
  const now = new Date();
  const deletedRehearsals = await prisma.event.findMany({
    where: {
      choreographyId,
      type: { kind: "REHEARSAL" },
      startsAt: { gte: now },
    },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.event.deleteMany({
      where: {
        choreographyId,
        type: { kind: "REHEARSAL" },
        startsAt: { gte: now },
      },
    }),
    prisma.eventChoreography.deleteMany({
      where: {
        choreographyId,
        event: { startsAt: { gte: now } },
      },
    }),
    prisma.choreography.update({
      where: { id: choreographyId },
      data: { archivedAt: now },
    }),
  ]);
  await Promise.all(deletedRehearsals.map(({ id }) => syncGoogleEventBestEffort(id)));
}

export async function deleteChoreography(choreographyId: string) {
  const now = new Date();
  const deletedRehearsals = await prisma.event.findMany({
    where: { choreographyId, type: { kind: "REHEARSAL" } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.event.deleteMany({
      where: {
        choreographyId,
        type: { kind: "REHEARSAL" },
        startsAt: { gte: now },
      },
    }),
    prisma.eventChoreography.deleteMany({
      where: {
        choreographyId,
        event: { startsAt: { gte: now } },
      },
    }),
    prisma.choreography.delete({ where: { id: choreographyId } }),
  ]);
  await Promise.all(deletedRehearsals.map(({ id }) => syncGoogleEventBestEffort(id)));
}
