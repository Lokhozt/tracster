import {
  eventKindAllowsChoreographyLinks,
  type EventKind,
} from "@/lib/event-type-helpers";

type AudienceMember = { userId: string };

export type ListedEventAudience = {
  type: { kind: EventKind | null };
  participants: AudienceMember[];
  choreography: { members: AudienceMember[] } | null;
  group: { members: AudienceMember[] } | null;
  choreographies: {
    choreography: {
      createdById: string;
      members: AudienceMember[];
      choreographers: AudienceMember[];
    };
  }[];
};

export function listedEventParticipantIds(event: ListedEventAudience): Set<string> {
  if (event.type.kind === "REHEARSAL") {
    const members = (event.group ?? event.choreography)?.members ?? [];
    return new Set(members.map((member) => member.userId));
  }

  const ids = new Set(event.participants.map((participant) => participant.userId));
  if (eventKindAllowsChoreographyLinks(event.type.kind)) {
    for (const link of event.choreographies) {
      for (const member of link.choreography.members) {
        ids.add(member.userId);
      }
    }
  }
  return ids;
}

export function userParticipatesInListedEvent(
  event: ListedEventAudience,
  userId: string,
): boolean {
  if (event.participants.some((participant) => participant.userId === userId)) {
    return true;
  }

  if (event.type.kind === "REHEARSAL") {
    return listedEventParticipantIds(event).has(userId);
  }

  if (!eventKindAllowsChoreographyLinks(event.type.kind)) {
    return false;
  }

  return event.choreographies.some(({ choreography }) => {
    return (
      choreography.createdById === userId ||
      choreography.choreographers.some((choreographer) => choreographer.userId === userId) ||
      choreography.members.some((member) => member.userId === userId)
    );
  });
}
