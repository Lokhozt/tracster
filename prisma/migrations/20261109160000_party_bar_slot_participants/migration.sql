INSERT INTO "EventParticipant" ("eventId", "userId", "assignedAt")
SELECT "eventId", "userId", "assignedAt"
FROM "EventPartyBarSlot"
ON CONFLICT ("eventId", "userId") DO NOTHING;
