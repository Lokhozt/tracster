import { prisma } from "@/lib/db";
import {
  BUILTIN_EVENT_TYPES,
  serializeEventType,
  type EventKind,
  type SerializedEventType,
} from "@/lib/event-type-helpers";
import { getServerTranslator, type ServerTranslator } from "@/i18n/server";

export {
  BUILTIN_EVENT_TYPE_IDS,
  BUILTIN_EVENT_TYPES,
  defaultEventTitle,
  eventKindAllowsChoreographyLinks,
  eventKindSkipsGenericCreatePermission,
  isGenericEventKind,
  serializeEventType,
  type SerializedEventType,
} from "@/lib/event-type-helpers";

export async function ensureEventTypes() {
  await Promise.all(
    BUILTIN_EVENT_TYPES.map((type) =>
      prisma.eventType.upsert({
        where: { id: type.id },
        update: {
          name: type.name,
          kind: type.kind,
          immutable: true,
          sortOrder: type.sortOrder,
        },
        create: {
          id: type.id,
          name: type.name,
          kind: type.kind,
          immutable: true,
          sortOrder: type.sortOrder,
        },
      }),
    ),
  );
}

export async function getEventTypes(t?: ServerTranslator): Promise<SerializedEventType[]> {
  await ensureEventTypes();
  const translator = t ?? await getServerTranslator();

  const types = await prisma.eventType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, kind: true, immutable: true, sortOrder: true },
  });

  return types.map((type) => serializeEventType(type, translator));
}

export async function getEventType(id: string) {
  await ensureEventTypes();
  return prisma.eventType.findUnique({
    where: { id },
    select: { id: true, name: true, kind: true, immutable: true, sortOrder: true },
  });
}

export async function getEventTypeByKind(kind: EventKind) {
  await ensureEventTypes();
  return prisma.eventType.findFirst({
    where: { kind, immutable: true },
    select: { id: true, name: true, kind: true, immutable: true, sortOrder: true },
  });
}
