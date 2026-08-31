import { listedEventWhere } from "@/lib/participation";
import { prisma } from "@/lib/db";
import { canEditEvent } from "@/lib/events";
import { eventKindAllowsChoreographyLinks } from "@/lib/event-type-helpers";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { hasGlobalAccess } from "@/lib/roles";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";
import { formatUserName, type UserNameFields } from "@/lib/users";

export type { SerializedScheduleEvent } from "@/lib/schedule-filters";

const scheduleUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

function uniqueSortedNames(users: Array<{ id: string } & UserNameFields>) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const user of users) {
    if (seen.has(user.id)) {
      continue;
    }
    seen.add(user.id);
    names.push(formatUserName(user));
  }
  return names.sort((a, b) => a.localeCompare(b));
}

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
            select: {
              userId: true,
              user: { select: scheduleUserSelect },
            },
          },
        },
      },
      group: {
        select: {
          members: {
            select: {
              userId: true,
              user: { select: scheduleUserSelect },
            },
          },
        },
      },
      choreographies: {
        select: {
          choreography: {
            select: {
              createdById: true,
              members: {
                select: {
                  userId: true,
                  user: { select: scheduleUserSelect },
                },
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
        select: {
          userId: true,
          user: { select: scheduleUserSelect },
        },
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
          choreography.members.some((member) => member.userId === userId)
        );
      });
      const rehearsalMember = event.group
        ? event.group.members.some((member) => member.userId === userId)
        : (event.choreography?.members.some((member) => member.userId === userId) ?? false);

      const isParticipating =
        event.createdById === userId ||
        event.participants.some((participant) => participant.userId === userId) ||
        (kind === "REHEARSAL" && rehearsalMember) ||
        (eventKindAllowsChoreographyLinks(kind) && involvedInLinkedChoreography);

      let participantNames: string[] = [];
      if (kind === "REHEARSAL") {
        participantNames = uniqueSortedNames(
          (event.group ?? event.choreography)?.members.map((member) => member.user) ?? [],
        );
      } else {
        participantNames = uniqueSortedNames([
          ...event.participants.map((participant) => participant.user),
          ...(eventKindAllowsChoreographyLinks(kind)
            ? event.choreographies.flatMap((link) =>
                link.choreography.members.map((member) => member.user),
              )
            : []),
        ]);
      }

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
        participantNames,
        isMember:
          kind === "REHEARSAL"
            ? rehearsalMember
            : eventKindAllowsChoreographyLinks(kind)
              ? involvedInLinkedChoreography
              : event.participants.some((participant) => participant.userId === userId),
        isParticipating,
        availabilityStatus:
          kind === "REHEARSAL" ? (event.availabilities[0]?.status ?? null) : null,
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
