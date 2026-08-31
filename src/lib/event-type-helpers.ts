export type EventKind =
  | "EVENT"
  | "REHEARSAL"
  | "REPRESENTATION"
  | "COMPETITION"
  | "DEMONSTRATION"
  | "FESTIVAL";

export const BUILTIN_EVENT_TYPE_IDS = {
  EVENT: "event-type-event",
  REHEARSAL: "event-type-rehearsal",
  REPRESENTATION: "event-type-representation",
  COMPETITION: "event-type-competition",
  DEMONSTRATION: "event-type-demonstration",
  FESTIVAL: "event-type-festival",
} as const;

export const BUILTIN_EVENT_TYPES = [
  { id: BUILTIN_EVENT_TYPE_IDS.EVENT, name: "Event", kind: "EVENT" as const, sortOrder: 0 },
  { id: BUILTIN_EVENT_TYPE_IDS.REHEARSAL, name: "Rehearsal", kind: "REHEARSAL" as const, sortOrder: 1 },
  {
    id: BUILTIN_EVENT_TYPE_IDS.REPRESENTATION,
    name: "Representation",
    kind: "REPRESENTATION" as const,
    sortOrder: 2,
  },
  { id: BUILTIN_EVENT_TYPE_IDS.COMPETITION, name: "Competition", kind: "COMPETITION" as const, sortOrder: 3 },
  {
    id: BUILTIN_EVENT_TYPE_IDS.DEMONSTRATION,
    name: "Demonstration",
    kind: "DEMONSTRATION" as const,
    sortOrder: 4,
  },
  { id: BUILTIN_EVENT_TYPE_IDS.FESTIVAL, name: "Festival", kind: "FESTIVAL" as const, sortOrder: 5 },
] as const;

export type SerializedEventType = {
  id: string;
  name: string;
  kind: EventKind | null;
  immutable: boolean;
  sortOrder: number;
};

export function serializeEventType(type: SerializedEventType): SerializedEventType {
  return {
    id: type.id,
    name: type.name,
    kind: type.kind,
    immutable: type.immutable,
    sortOrder: type.sortOrder,
  };
}

export function isGenericEventKind(kind: EventKind | null): boolean {
  return kind !== "REHEARSAL" && kind !== "REPRESENTATION";
}

export function eventKindAllowsChoreographyLinks(kind: EventKind | null): boolean {
  return kind === "REPRESENTATION" || kind === "DEMONSTRATION";
}

export function eventKindSkipsGenericCreatePermission(kind: EventKind | null): boolean {
  return kind === "REHEARSAL" || eventKindAllowsChoreographyLinks(kind);
}

export function defaultEventTitle(
  type: { name: string; kind: EventKind | null },
  title?: string | null,
) {
  const trimmed = title?.trim();
  if (trimmed) {
    return trimmed;
  }
  return type.name;
}
