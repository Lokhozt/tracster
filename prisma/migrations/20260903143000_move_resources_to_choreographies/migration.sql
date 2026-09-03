-- Resources were introduced immediately before this migration and are now
-- corrected to belong to choreographies. Preserve unambiguous development data.
ALTER TABLE "EventResource" DROP CONSTRAINT "EventResource_eventId_fkey";
ALTER TABLE "EventResource" ADD COLUMN "choreographyId" TEXT;

UPDATE "EventResource" AS resource
SET "choreographyId" = event."choreographyId"
FROM "Event" AS event
WHERE resource."eventId" = event."id"
  AND event."choreographyId" IS NOT NULL;

UPDATE "EventResource" AS resource
SET "choreographyId" = (
  SELECT MIN(link."choreographyId")
  FROM "EventChoreography" AS link
  WHERE link."eventId" = resource."eventId"
)
WHERE resource."choreographyId" IS NULL
  AND (
    SELECT COUNT(*)
    FROM "EventChoreography" AS link
    WHERE link."eventId" = resource."eventId"
  ) = 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "EventResource" WHERE "choreographyId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Existing event resources cannot be mapped unambiguously to a choreography.';
  END IF;
END $$;

DROP INDEX "EventResource_eventId_status_createdAt_idx";
ALTER TABLE "EventResource" DROP COLUMN "eventId";
ALTER TABLE "EventResource" ALTER COLUMN "choreographyId" SET NOT NULL;

ALTER TABLE "EventResource" RENAME TO "ChoreographyResource";
ALTER TYPE "EventResourceType" RENAME TO "ChoreographyResourceType";
ALTER TYPE "EventResourceVisibility" RENAME TO "ChoreographyResourceVisibility";
ALTER TYPE "EventResourceStatus" RENAME TO "ChoreographyResourceStatus";

ALTER TABLE "ChoreographyResource"
  RENAME CONSTRAINT "EventResource_pkey" TO "ChoreographyResource_pkey";
ALTER TABLE "ChoreographyResource"
  RENAME CONSTRAINT "EventResource_uploadedById_fkey" TO "ChoreographyResource_uploadedById_fkey";
ALTER INDEX "EventResource_storageKey_key" RENAME TO "ChoreographyResource_storageKey_key";
ALTER INDEX "EventResource_uploadedById_idx" RENAME TO "ChoreographyResource_uploadedById_idx";

CREATE INDEX "ChoreographyResource_choreographyId_status_createdAt_idx"
  ON "ChoreographyResource"("choreographyId", "status", "createdAt");

ALTER TABLE "ChoreographyResource"
  ADD CONSTRAINT "ChoreographyResource_choreographyId_fkey"
  FOREIGN KEY ("choreographyId") REFERENCES "Choreography"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
