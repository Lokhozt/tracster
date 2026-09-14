import { prisma } from "@/lib/db";

/**
 * Deletes a member and unlinks them from events and choreographies.
 * Content they created is kept and reassigned to the acting admin.
 * A piece that would otherwise have no choreographer is assigned to that admin.
 */
export async function deleteManagedUser(targetId: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const choreographies = await tx.choreography.findMany({
      where: { choreographers: { some: { userId: targetId } } },
      select: {
        id: true,
        _count: { select: { choreographers: true } },
      },
    });

    for (const choreography of choreographies) {
      if (choreography._count.choreographers > 1) {
        continue;
      }
      await tx.choreographyChoreographer.upsert({
        where: {
          choreographyId_userId: {
            choreographyId: choreography.id,
            userId: actorId,
          },
        },
        update: {},
        create: {
          choreographyId: choreography.id,
          userId: actorId,
        },
      });
    }

    await tx.choreography.updateMany({
      where: { createdById: targetId },
      data: { createdById: actorId },
    });
    await tx.event.updateMany({
      where: { createdById: targetId },
      data: { createdById: actorId },
    });

    await tx.user.delete({ where: { id: targetId } });
  });
}
