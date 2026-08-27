import { listedEventWhere } from "@/lib/participation";
import { prisma } from "@/lib/db";
import { canEditEvent } from "@/lib/events";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { hasGlobalAccess } from "@/lib/roles";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";

export type { SerializedScheduleEvent } from "@/lib/schedule-filters";

export async function getUserScheduleEvents(userId: string) {
  const globalAccess = await hasGlobalAccess(userId);

  const records = await prisma.event.findMany({
    where: globalAccess ? undefined : listedEventWhere(userId),
    include: {
      ...listedLocationInclude,
      type: { select: { id: true, name: true, kind: true } },
      choreography: {
        select: {
          id: true,
          title: true,
          members: {
            where: { userId },
            select: { userId: true },
          },
        },
      },
      group: {
        select: {
          members: {
            where: { userId },
            select: { userId: true },
          },
        },
      },
      choreographies: {
        select: {
          choreography: {
            select: {
              createdById: true,
              members: {
                where: { userId },
                select: { userId: true },
              },
              choreographers: {
                where: { userId },
                select: { userId: true },
              },
            },
          },
        },
      },
      participants: {
        where: { userId },
        select: { userId: true },
      },
      availabilities: {
        where: { userId },
        select: { status: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const events: SerializedScheduleEvent[] = await Promise.all(
    records.map(async (event) => {
      const kind = event.type.kind;
      const involvedInLinkedChoreography = event.choreographies.some(({ choreography }) => {
        return (
          choreography.createdById === userId ||
          choreography.choreographers.length > 0 ||
          choreography.members.length > 0
        );
      });
      const repetitionMember = event.group
        ? event.group.members.length > 0
        : (event.choreography?.members.length ?? 0) > 0;

      const isParticipating =
        event.createdById === userId ||
        event.participants.length > 0 ||
        (kind === "REPETITION" && repetitionMember) ||
        (kind === "REPRESENTATION" && involvedInLinkedChoreography);

      return {
        id: event.id,
        typeId: event.type.id,
        typeName: event.type.name,
        typeKind: kind,
        title: event.title || null,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
        location: displayLocation(event),
        choreographyId: event.choreographyId,
        choreographyTitle: event.choreography?.title ?? null,
        isMember:
          kind === "REPETITION"
            ? repetitionMember
            : kind === "REPRESENTATION"
              ? involvedInLinkedChoreography
              : event.participants.length > 0,
        isParticipating,
        availabilityStatus:
          kind === "REPETITION" ? (event.availabilities[0]?.status ?? null) : null,
        href: `/events/${event.id}`,
        canEdit: await canEditEvent(event.id, userId),
      };
    }),
  );

  return events.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function getUpcomingScheduleEvents(events: SerializedScheduleEvent[]) {
  const now = new Date();
  return events.filter((event) => new Date(event.startsAt) >= now);
}
