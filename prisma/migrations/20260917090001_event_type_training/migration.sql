INSERT INTO "EventType" ("id", "name", "kind", "immutable", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'event-type-training',
  'Training',
  'TRAINING',
  true,
  6,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "kind" = 'TRAINING',
  "immutable" = true,
  "sortOrder" = 6;
