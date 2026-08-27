import { prisma } from "@/lib/db";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { canOpenListedOrJoinableEvent, listedEventWhere } from "@/lib/participation";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { hasGlobalAccess } from "@/lib/roles";
import {
  defaultEventTitle,
  isGenericEventKind,
  type SerializedEventType,
  serializeEventType,
} from "@/lib/event-type-helpers";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { getGroupForChoreography } from "@/lib/groups";

const eventTypeSelect = {
  id: true,
  name: true,
  kind: true,
  immutable: true,
  sortOrder: true,
} as const;

const eventListInclude = {
  ...listedLocationInclude,
  type: { select: eventTypeSelect },
  choreography: { select: { id: true, title: true } },
  group: { select: { id: true, name: true } },
  choreographies: {
    where: { choreography: visibleChoreographyWhere },
    include: {
      choreography: { select: { id: true, title: true } },
    },
    orderBy: { choreography: { title: "asc" as const } },
  },
  participants: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { user: { lastName: "asc" as const } },
  },
};

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

async function getEventAccessRecord(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: {
      createdById: true,
      choreographyId: true,
      allowParticipantJoin: true,
      allowJoinRequests: true,
      hideFromNonParticipants: true,
      type: { select: { kind: true } },
      participants: { select: { userId: true } },
      joinRequests: { select: { userId: true } },
      choreographies: { select: { choreographyId: true } },
    },
  });
}

export async function canViewEvent(eventId: string, userId: string): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const event = await getEventAccessRecord(eventId);
  if (!event) {
    return false;
  }

  if (event.createdById === userId) {
    return true;
  }

  const kind = event.type.kind;

  if (kind === "REPETITION") {
    if (!event.choreographyId) {
      return canOpenListedOrJoinableEvent(event, userId);
    }
    return canViewChoreography(event.choreographyId, userId);
  }

  if (kind === "REPRESENTATION") {
    for (const link of event.choreographies) {
      if (await canViewChoreography(link.choreographyId, userId)) {
        return true;
      }
    }
    return canOpenListedOrJoinableEvent(event, userId);
  }

  return canOpenListedOrJoinableEvent(event, userId);
}

export async function canEditEvent(eventId: string, userId: string): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const event = await getEventAccessRecord(eventId);
  if (!event) {
    return false;
  }

  if (event.createdById === userId) {
    return true;
  }

  if (event.type.kind === "REPETITION" && event.choreographyId) {
    return canEditChoreography(event.choreographyId, userId);
  }

  if (event.type.kind === "REPRESENTATION") {
    for (const link of event.choreographies) {
      if (await canEditChoreography(link.choreographyId, userId)) {
        return true;
      }
    }
  }

  return false;
}

export async function getUserEvents(userId: string) {
  const globalAccess = await hasGlobalAccess(userId);

  return prisma.event.findMany({
    where: globalAccess ? undefined : listedEventWhere(userId),
    include: eventListInclude,
    orderBy: { startsAt: "asc" },
  });
}

export type SerializedEvent = {
  id: string;
  title: string;
  displayTitle: string;
  description: string | null;
  notes: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  locationId: string | null;
  allowParticipantJoin: boolean;
  allowJoinRequests: boolean;
  hideFromNonParticipants: boolean;
  type: SerializedEventType;
  choreographyId: string | null;
  choreographyTitle: string | null;
  groupId: string | null;
  groupName: string | null;
  choreographies: { id: string; title: string }[];
  participants: { id: string; name: string; email: string }[];
};

export function serializeEvent(event: {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  startsAt: Date;
  endsAt: Date | null;
  locationId: string | null;
  allowParticipantJoin: boolean;
  allowJoinRequests: boolean;
  hideFromNonParticipants: boolean;
  type: SerializedEventType;
  choreographyId: string | null;
  groupId: string | null;
  choreography: { id: string; title: string } | null;
  group: { id: string; name: string } | null;
  listedLocation?: { id?: string; name: string } | null;
  location?: string | null;
  choreographies: { choreography: { id: string; title: string } }[];
  participants: {
    user: { id: string; firstName: string; lastName: string; email: string };
  }[];
}): SerializedEvent {
  const type = serializeEventType(event.type);
  return {
    id: event.id,
    title: event.title,
    displayTitle: defaultEventTitle(type, event.title),
    description: event.description,
    notes: event.notes,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    location: displayLocation(event),
    locationId: event.locationId,
    allowParticipantJoin: event.allowParticipantJoin,
    allowJoinRequests: event.allowJoinRequests,
    hideFromNonParticipants: event.hideFromNonParticipants,
    type,
    choreographyId: event.choreographyId,
    choreographyTitle: event.choreography?.title ?? null,
    groupId: event.groupId,
    groupName: event.group?.name ?? null,
    choreographies: event.choreographies.map((link) => ({
      id: link.choreography.id,
      title: link.choreography.title,
    })),
    participants: event.participants.map(({ user }) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
    })),
  };
}

export async function canCreateEventOfType(options: {
  userId: string;
  kind: SerializedEventType["kind"];
  choreographyId?: string | null;
  choreographyIds?: string[];
  canCreateGeneric: boolean;
}): Promise<boolean> {
  if (options.kind === "REPETITION" && options.choreographyId) {
    return canEditChoreography(options.choreographyId, options.userId);
  }

  if (options.kind === "REPRESENTATION") {
    const ids = options.choreographyIds ?? [];
    if (ids.length === 0) {
      return options.canCreateGeneric;
    }
    for (const choreographyId of ids) {
      if (!(await canEditChoreography(choreographyId, options.userId))) {
        return false;
      }
    }
    return true;
  }

  return options.canCreateGeneric;
}

export async function validateEventTypeFields(options: {
  type: SerializedEventType;
  title?: string | null;
  choreographyId?: string | null;
  choreographyIds?: string[];
  groupId?: string | null;
}): Promise<string | null> {
  const title = options.title?.trim() ?? "";
  if (isGenericEventKind(options.type.kind) && title.length < 2) {
    return "Title must be at least 2 characters.";
  }

  if (options.type.kind !== "REPETITION") {
    if (options.groupId) {
      return "Only repetition events can be assigned to a group.";
    }
  }

  if (options.type.kind === "REPETITION" && options.groupId) {
    if (!options.choreographyId) {
      return "Attach a choreography before assigning a group.";
    }
    const group = await getGroupForChoreography(options.choreographyId, options.groupId);
    if (!group) {
      return "Selected group does not belong to this choreography.";
    }
  }

  if (options.type.kind !== "REPETITION" && options.choreographyId) {
    return "Only repetition events can be attached to a single choreography.";
  }

  if (options.type.kind !== "REPRESENTATION" && (options.choreographyIds?.length ?? 0) > 0) {
    return "Only representation events can be attached to multiple choreographies.";
  }

  return null;
}
