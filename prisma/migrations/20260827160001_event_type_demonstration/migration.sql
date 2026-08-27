INSERT INTO "EventType" ("id", "name", "kind", "immutable", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'event-type-demonstration',
  'Demonstration',
  'DEMONSTRATION',
  true,
  4,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "kind" = 'DEMONSTRATION',
  "immutable" = true,
  "sortOrder" = 4;
