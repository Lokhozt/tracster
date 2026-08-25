import { prisma } from "@/lib/db";
import { hasGlobalAccess } from "@/lib/roles";

export async function isChoreographer(
  choreographyId: string,
  userId: string,
): Promise<boolean> {
  const assignment = await prisma.choreographyChoreographer.findUnique({
    where: {
      choreographyId_userId: { choreographyId, userId },
    },
  });
  return Boolean(assignment);
}

export async function isChoreographyMember(
  choreographyId: string,
  userId: string,
): Promise<boolean> {
  const assignment = await prisma.choreographyMember.findUnique({
    where: {
      choreographyId_userId: { choreographyId, userId },
    },
  });
  return Boolean(assignment);
}

export async function canEditChoreography(
  choreographyId: string,
  userId: string,
): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const choreography = await prisma.choreography.findUnique({
    where: { id: choreographyId },
    select: { createdById: true },
  });

  if (!choreography) {
    return false;
  }

  if (choreography.createdById === userId) {
    return true;
  }

  return isChoreographer(choreographyId, userId);
}

export async function canViewChoreography(
  choreographyId: string,
  userId: string,
): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const choreography = await prisma.choreography.findUnique({
    where: { id: choreographyId },
    select: { createdById: true },
  });

  if (!choreography) {
    return false;
  }

  if (choreography.createdById === userId) {
    return true;
  }

  const [choreographer, member] = await Promise.all([
    isChoreographer(choreographyId, userId),
    isChoreographyMember(choreographyId, userId),
  ]);

  return choreographer || member;
}
