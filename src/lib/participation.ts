export type ParticipationSettings = {
  allowParticipantJoin: boolean;
  allowJoinRequests: boolean;
  hideFromNonParticipants: boolean;
};

export const defaultParticipationSettings: ParticipationSettings = {
  allowParticipantJoin: false,
  allowJoinRequests: false,
  hideFromNonParticipants: true,
};

export function normalizeParticipationSettings(
  settings: ParticipationSettings,
): ParticipationSettings | { error: string } {
  if (settings.allowParticipantJoin && settings.allowJoinRequests) {
    return {
      error: "Participants cannot both join freely and request to join.",
    };
  }

  return settings;
}

export function listedChoreographyWhere(userId: string) {
  return {
    archivedAt: null,
    OR: [
      { createdById: userId },
      { choreographers: { some: { userId } } },
      { members: { some: { userId } } },
      { joinRequests: { some: { userId } } },
      { hideFromNonParticipants: false },
    ],
  };
}

export function listedEventWhere(userId: string) {
  return {
    OR: [
      { createdById: userId },
      { participants: { some: { userId } } },
      { joinRequests: { some: { userId } } },
      { hideFromNonParticipants: false },
      { choreography: listedChoreographyWhere(userId) },
      {
        choreographies: {
          some: {
            choreography: listedChoreographyWhere(userId),
          },
        },
      },
    ],
  };
}

export function canOpenListedOrJoinableChoreography(
  choreography: {
    createdById: string;
    allowParticipantJoin: boolean;
    allowJoinRequests: boolean;
    hideFromNonParticipants: boolean;
    choreographers: { userId: string }[];
    members: { userId: string }[];
    joinRequests: { userId: string }[];
  },
  userId: string,
): boolean {
  if (choreography.createdById === userId) {
    return true;
  }
  if (choreography.choreographers.some((item) => item.userId === userId)) {
    return true;
  }
  if (choreography.members.some((item) => item.userId === userId)) {
    return true;
  }
  if (choreography.joinRequests.some((item) => item.userId === userId)) {
    return true;
  }
  if (!choreography.hideFromNonParticipants) {
    return true;
  }
  return choreography.allowParticipantJoin || choreography.allowJoinRequests;
}

export function canOpenListedOrJoinableEvent(
  event: {
    createdById: string;
    allowParticipantJoin: boolean;
    allowJoinRequests: boolean;
    hideFromNonParticipants: boolean;
    participants: { userId: string }[];
    joinRequests: { userId: string }[];
  },
  userId: string,
): boolean {
  if (event.createdById === userId) {
    return true;
  }
  if (event.participants.some((item) => item.userId === userId)) {
    return true;
  }
  if (event.joinRequests.some((item) => item.userId === userId)) {
    return true;
  }
  if (!event.hideFromNonParticipants) {
    return true;
  }
  return event.allowParticipantJoin || event.allowJoinRequests;
}
