import { prisma } from "@/lib/db";
import { listedLocationInclude } from "@/lib/locations";
import type { ParticipationSettings } from "@/lib/participation";
import { canCreateEvent } from "@/lib/site-settings";
import {
  canCreateEventOfType,
  canViewEvent,
  serializeEvent,
} from "@/lib/events";
import type { SerializedEvent } from "@/lib/events";

const eventTypeSelect = {
  id: true,
  name: true,
  kind: true,
  immutable: true,
  sortOrder: true,
} as const;

export type EventCreateCopy = {
  typeId: string;
  description: string;
  notes: string;
  locationId: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  participation: ParticipationSettings;
  partyBarSlotsEnabled: boolean;
};

export function eventCreateCopyFromSerialized(event: SerializedEvent): EventCreateCopy {
  return {
    typeId: event.type.id,
    description: event.description ?? "",
    notes: event.notes ?? "",
    locationId: event.locationId,
    location: event.locationId ? null : event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    participation: {
      allowParticipantJoin: event.allowParticipantJoin,
      allowJoinRequests: event.allowJoinRequests,
      hideFromNonParticipants: event.hideFromNonParticipants,
    },
    partyBarSlotsEnabled: event.partyBarSlotsEnabled,
  };
}

export async function loadEventCreateCopy(
  eventId: string,
  userId: string,
): Promise<EventCreateCopy | null> {
  if (!(await canViewEvent(eventId, userId))) {
    return null;
  }

  const record = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ...listedLocationInclude,
      type: { select: eventTypeSelect },
      choreographies: { select: { choreographyId: true } },
    },
  });
  if (!record) {
    return null;
  }

  const canCreateGeneric = await canCreateEvent(userId);
  const choreographyIds = record.choreographies.map((link) => link.choreographyId);
  if (
    !(await canCreateEventOfType({
      userId,
      kind: record.type.kind,
      choreographyId: record.choreographyId,
      choreographyIds,
      canCreateGeneric,
    }))
  ) {
    return null;
  }

  const serialized = serializeEvent({
    ...record,
    choreography: null,
    group: null,
    choreographies: [],
    participants: [],
  });

  return eventCreateCopyFromSerialized(serialized);
}
