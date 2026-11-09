CREATE TABLE "EventPartyBarSlot" (
    "eventId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPartyBarSlot_pkey" PRIMARY KEY ("eventId","slotIndex")
);

CREATE UNIQUE INDEX "EventPartyBarSlot_eventId_userId_key" ON "EventPartyBarSlot"("eventId", "userId");
CREATE INDEX "EventPartyBarSlot_eventId_idx" ON "EventPartyBarSlot"("eventId");

ALTER TABLE "EventPartyBarSlot" ADD CONSTRAINT "EventPartyBarSlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventPartyBarSlot" ADD CONSTRAINT "EventPartyBarSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "EventPartyBarSlot" ("eventId", "slotIndex", "userId", "assignedAt")
SELECT ranked."eventId", ranked.slot_index, ranked."userId", ranked."assignedAt"
FROM (
    SELECT
        ep."eventId",
        ep."userId",
        ep."assignedAt",
        (ROW_NUMBER() OVER (PARTITION BY ep."eventId" ORDER BY ep."assignedAt") - 1)::INTEGER AS slot_index
    FROM "EventParticipant" ep
    INNER JOIN "Event" e ON e.id = ep."eventId"
    INNER JOIN "EventType" et ON et.id = e."typeId"
    WHERE et.kind = 'PARTY'
) ranked
WHERE ranked.slot_index >= 0 AND ranked.slot_index < 3;

DELETE FROM "EventParticipant" ep
USING "Event" e, "EventType" et
WHERE ep."eventId" = e.id
  AND e."typeId" = et.id
  AND et.kind = 'PARTY';
