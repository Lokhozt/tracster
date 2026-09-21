import { prisma } from "@/lib/db";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { canOpenListedOrJoinableEvent, visibleEventWhere } from "@/lib/participation";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { hasGlobalAccess } from "@/lib/roles";
import {
  defaultEventTitle,
  eventKindAllowsChoreographyLinks,
  eventKindRestrictedToCompetitors,
  isGenericEventKind,
  type SerializedEventType,
  serializeEventType,
} from "@/lib/event-type-helpers";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { hasUpcomingSeriesEvents, loadSeriesSiblings } from "@/lib/event-series";
import { getGroupForChoreography } from "@/lib/groups";
import { nestedUserNameOrderBy, sortUsersByName } from "@/lib/users";
import { getServerTranslator, type ServerTranslator } from "@/i18n/server";

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
    orderBy: nestedUserNameOrderBy,
  },
  joinRequests: {
    select: { userId: true },
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

async function viewerCanSeeCompetitorOnlyEvents(userId: string): Promise<boolean> {
  if (await hasGlobalAccess(userId)) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isCompetitor: true },
  });
  return Boolean(user?.isCompetitor);
}

export async function canViewEvent(eventId: string, userId: string): Promise<boolean> {
  const event = await getEventAccessRecord(eventId);
  if (!event) {
    return false;
  }

  if (eventKindRestrictedToCompetitors(event.type.kind)) {
    if (!(await viewerCanSeeCompetitorOnlyEvents(userId))) {
      return false;
    }
  }

  if (await hasGlobalAccess(userId)) {
    return true;
  }

  if (event.createdById === userId) {
    return true;
  }

  const kind = event.type.kind;

  if (kind === "REHEARSAL") {
    if (!event.choreographyId) {
      return canOpenListedOrJoinableEvent(event, userId);
    }
    return canViewChoreography(event.choreographyId, userId);
  }

  if (eventKindAllowsChoreographyLinks(kind)) {
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
  const event = await getEventAccessRecord(eventId);
  if (!event) {
    return false;
  }

  if (eventKindRestrictedToCompetitors(event.type.kind)) {
    if (!(await viewerCanSeeCompetitorOnlyEvents(userId))) {
      return false;
    }
  }

  if (await hasGlobalAccess(userId)) {
    return true;
  }

  if (event.createdById === userId) {
    return true;
  }

  if (event.type.kind === "REHEARSAL" && event.choreographyId) {
    return canEditChoreography(event.choreographyId, userId);
  }

  if (eventKindAllowsChoreographyLinks(event.type.kind)) {
    for (const link of event.choreographies) {
      if (await canEditChoreography(link.choreographyId, userId)) {
        return true;
      }
    }
  }

  return false;
}

export async function getUserEvents(userId: string, t?: ServerTranslator) {
  const [globalAccess, viewer, translator] = await Promise.all([
    hasGlobalAccess(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { isCompetitor: true },
    }),
    t ? Promise.resolve(t) : getServerTranslator(),
  ]);

  const events = await prisma.event.findMany({
    where: visibleEventWhere(userId, {
      globalAccess,
      isCompetitor: Boolean(viewer?.isCompetitor),
    }),
    include: eventListInclude,
    orderBy: { startsAt: "asc" },
  });
  const siblings = await loadSeriesSiblings(events);
  return events.map((event) => ({
    ...event,
    type: serializeEventType(event.type, translator),
    hasUpcomingSeriesEvents: hasUpcomingSeriesEvents(event, siblings),
  }));
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
  seriesId: string | null;
  hasUpcomingSeriesEvents: boolean;
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
  seriesId?: string | null;
  hasUpcomingSeriesEvents?: boolean;
  choreography: { id: string; title: string } | null;
  group: { id: string; name: string } | null;
  listedLocation?: { id?: string; name: string } | null;
  location?: string | null;
  choreographies: { choreography: { id: string; title: string } }[];
  participants: {
    user: { id: string; firstName: string; lastName: string; email: string };
  }[];
}, t?: ServerTranslator): SerializedEvent {
  const type = serializeEventType(event.type, t);
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
    seriesId: event.seriesId ?? null,
    hasUpcomingSeriesEvents: event.hasUpcomingSeriesEvents ?? false,
    choreographies: event.choreographies.map((link) => ({
      id: link.choreography.id,
      title: link.choreography.title,
    })),
    participants: sortUsersByName(
      event.participants.map(({ user }) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
      })),
    ),
  };
}

export async function canCreateEventOfType(options: {
  userId: string;
  kind: SerializedEventType["kind"];
  choreographyId?: string | null;
  choreographyIds?: string[];
  canCreateGeneric: boolean;
}): Promise<boolean> {
  if (eventKindRestrictedToCompetitors(options.kind)) {
    if (!(await viewerCanSeeCompetitorOnlyEvents(options.userId))) {
      return false;
    }
  }

  if (options.kind === "REHEARSAL" && options.choreographyId) {
    return canEditChoreography(options.choreographyId, options.userId);
  }

  if (eventKindAllowsChoreographyLinks(options.kind)) {
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

  if (options.type.kind !== "REHEARSAL") {
    if (options.groupId) {
      return "Only rehearsal events can be assigned to a group.";
    }
  }

  if (options.type.kind === "REHEARSAL" && options.groupId) {
    if (!options.choreographyId) {
      return "Attach a choreography before assigning a group.";
    }
    const group = await getGroupForChoreography(options.choreographyId, options.groupId);
    if (!group) {
      return "Selected group does not belong to this choreography.";
    }
  }

  if (options.type.kind !== "REHEARSAL" && options.choreographyId) {
    return "Only rehearsal events can be attached to a single choreography.";
  }

  if (!eventKindAllowsChoreographyLinks(options.type.kind) && (options.choreographyIds?.length ?? 0) > 0) {
    return "Only representation and demonstration events can be attached to choreographies.";
  }

  return null;
}

export async function competitorParticipantsAllowed(
  kind: SerializedEventType["kind"],
  participantIds: string[],
): Promise<string | null> {
  if (!eventKindRestrictedToCompetitors(kind) || participantIds.length === 0) {
    return null;
  }

  const uniqueIds = [...new Set(participantIds)];
  const competitors = await prisma.user.count({
    where: { id: { in: uniqueIds }, isCompetitor: true },
  });
  if (competitors !== uniqueIds.length) {
    return "Only competitors can be added to training events.";
  }
  return null;
}
