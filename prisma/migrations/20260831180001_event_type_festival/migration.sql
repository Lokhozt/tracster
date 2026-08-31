INSERT INTO "EventType" ("id", "name", "kind", "immutable", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'event-type-festival',
  'Festival',
  'FESTIVAL',
  true,
  5,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "kind" = 'FESTIVAL',
  "immutable" = true,
  "sortOrder" = 5;
