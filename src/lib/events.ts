import { prisma } from "@/lib/db";
import { hasGlobalAccess } from "@/lib/roles";

export async function isEventParticipant(
  eventId: string,
  userId: string,
): Promise<boolean> {
  const assignment = await prisma.eventParticipant.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });
  return Boolean(assignment);
}

export async function canViewEvent(eventId: string, userId: string): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true },
  });

  if (!event) {
    return false;
  }

  if (event.createdById === userId) {
    return true;
  }

  return isEventParticipant(eventId, userId);
}

export async function canEditEvent(eventId: string, userId: string): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true },
  });

  if (!event) {
    return false;
  }

  return event.createdById === userId;
}

export async function getUserEvents(userId: string) {
  const globalAccess = await hasGlobalAccess(userId);

  return prisma.event.findMany({
    where: globalAccess
      ? undefined
      : {
          OR: [
            { createdById: userId },
            { participants: { some: { userId } } },
          ],
        },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { user: { lastName: "asc" } },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

export type SerializedEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  participants: { id: string; name: string; email: string }[];
};

export function serializeEvent(
  event: Awaited<ReturnType<typeof getUserEvents>>[number],
): SerializedEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    location: event.location,
    participants: event.participants.map(({ user }) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
    })),
  };
}
