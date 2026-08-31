export const DEFAULT_LOCATION_START_HOUR = 9;
export const DEFAULT_LOCATION_END_HOUR = 20;

export type IsoDate = string;
export type IsoDateTime = string;

export type SchedulingItemDraft = {
  id: string;
  choreographyId: string;
  groupId: string | null;
  durationMinutes: number;
  allowedLocationIds: string[];
  allowedWindows: Array<{ startsAt: IsoDateTime; endsAt: IsoDateTime }>;
};

export type LocationUnavailability = {
  locationId: string;
  day: IsoDate;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
};

export type SchedulingRequest = {
  items: SchedulingItemDraft[];
  days: IsoDate[];
  locationIds: string[];
  locationUnavailabilities: LocationUnavailability[];
  restMinutes: number;
};

export type SchedulePlacement = {
  itemId: string;
  choreographyId: string;
  choreographyTitle: string;
  groupId: string | null;
  groupName: string | null;
  locationId: string;
  locationName: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  participantNames: string[];
};

export type ScheduleCaveat = {
  kind: "participant_unavailable" | "choreographer_unavailable" | "constraint";
  message: string;
  userId?: string;
  userName?: string;
};

export type SchedulingCandidate = {
  id: string;
  score: number;
  placements: SchedulePlacement[];
  caveats: ScheduleCaveat[];
};

export type IntervalMs = {
  start: number;
  end: number;
};

export type SchedulingPerson = {
  id: string;
  name: string;
  unavailability: IntervalMs[];
  availableInPeriod: boolean;
};

export type ResolvedSchedulingItem = {
  id: string;
  index: number;
  choreographyId: string;
  choreographyTitle: string;
  groupId: string | null;
  groupName: string | null;
  durationMs: number;
  allowedLocationIds: string[] | null;
  allowedWindows: IntervalMs[] | null;
  choreographers: SchedulingPerson[];
  participants: SchedulingPerson[];
};

export type ResolvedLocationWindow = {
  locationId: string;
  locationName: string;
  day: IsoDate;
  start: number;
  end: number;
};

export type SchedulingProblem = {
  items: ResolvedSchedulingItem[];
  windows: ResolvedLocationWindow[];
  restMs: number;
};
