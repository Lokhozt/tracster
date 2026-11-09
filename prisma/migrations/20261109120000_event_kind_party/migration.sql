ALTER TYPE "EventKind" ADD VALUE 'PARTY';

INSERT INTO "EventType" ("id", "name", "kind", "immutable", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'event-type-party',
  'Party',
  'PARTY',
  true,
  7,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "kind" = 'PARTY',
  "immutable" = true,
  "sortOrder" = 7;
