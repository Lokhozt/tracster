-- Rename the event kind and built-in event type from Repetition to Rehearsal.
ALTER TYPE "EventKind" RENAME VALUE 'REPETITION' TO 'REHEARSAL';

UPDATE "EventType"
SET
  "id" = 'event-type-rehearsal',
  "name" = 'Rehearsal',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'event-type-repetition';
