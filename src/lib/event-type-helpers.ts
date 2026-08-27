export type EventKind =
  | "EVENT"
  | "REPETITION"
  | "REPRESENTATION"
  | "COMPETITION"
  | "DEMONSTRATION";

export const BUILTIN_EVENT_TYPE_IDS = {
  EVENT: "event-type-event",
  REPETITION: "event-type-repetition",
  REPRESENTATION: "event-type-representation",
  COMPETITION: "event-type-competition",
  DEMONSTRATION: "event-type-demonstration",
} as const;

export const BUILTIN_EVENT_TYPES = [
  { id: BUILTIN_EVENT_TYPE_IDS.EVENT, name: "Event", kind: "EVENT" as const, sortOrder: 0 },
  { id: BUILTIN_EVENT_TYPE_IDS.REPETITION, name: "Repetition", kind: "REPETITION" as const, sortOrder: 1 },
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
  return kind !== "REPETITION" && kind !== "REPRESENTATION";
}

export function eventKindAllowsChoreographyLinks(kind: EventKind | null): boolean {
  return kind === "REPRESENTATION" || kind === "DEMONSTRATION";
}

export function eventKindSkipsGenericCreatePermission(kind: EventKind | null): boolean {
  return kind === "REPETITION" || eventKindAllowsChoreographyLinks(kind);
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
