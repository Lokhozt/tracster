-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('EVENT', 'REPETITION', 'REPRESENTATION', 'COMPETITION');

-- CreateTable
CREATE TABLE "EventType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EventKind",
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventType_name_key" ON "EventType"("name");
CREATE UNIQUE INDEX "EventType_kind_key" ON "EventType"("kind");

INSERT INTO "EventType" ("id", "name", "kind", "immutable", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('event-type-event', 'Event', 'EVENT', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('event-type-repetition', 'Repetition', 'REPETITION', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('event-type-representation', 'Representation', 'REPRESENTATION', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('event-type-competition', 'Competition', 'COMPETITION', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Alter Event
ALTER TABLE "Event" ADD COLUMN "typeId" TEXT;
ALTER TABLE "Event" ADD COLUMN "notes" TEXT;
ALTER TABLE "Event" ADD COLUMN "choreographyId" TEXT;
ALTER TABLE "Event" ADD COLUMN "groupId" TEXT;
ALTER TABLE "Event" ALTER COLUMN "title" SET DEFAULT '';

UPDATE "Event" SET "typeId" = 'event-type-event' WHERE "typeId" IS NULL;

INSERT INTO "Event" (
  "id", "typeId", "title", "description", "notes", "startsAt", "endsAt",
  "locationId", "location", "createdById", "choreographyId", "groupId",
  "allowParticipantJoin", "allowJoinRequests", "hideFromNonParticipants",
  "createdAt", "updatedAt"
)
SELECT
  "id",
  'event-type-repetition',
  COALESCE("title", ''),
  NULL,
  "notes",
  "startsAt",
  "endsAt",
  "locationId",
  "location",
  "createdById",
  "choreographyId",
  "groupId",
  false,
  false,
  true,
  "createdAt",
  "updatedAt"
FROM "RepetitionEvent";

INSERT INTO "Event" (
  "id", "typeId", "title", "description", "notes", "startsAt", "endsAt",
  "locationId", "location", "createdById",
  "allowParticipantJoin", "allowJoinRequests", "hideFromNonParticipants",
  "createdAt", "updatedAt"
)
SELECT
  "id",
  'event-type-representation',
  COALESCE("title", ''),
  NULL,
  "notes",
  "startsAt",
  "endsAt",
  "locationId",
  "location",
  "createdById",
  false,
  false,
  true,
  "createdAt",
  "updatedAt"
FROM "Representation";

ALTER TABLE "Event" ALTER COLUMN "typeId" SET NOT NULL;

CREATE TABLE "EventChoreography" (
    "eventId" TEXT NOT NULL,
    "choreographyId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventChoreography_pkey" PRIMARY KEY ("eventId","choreographyId")
);

INSERT INTO "EventChoreography" ("eventId", "choreographyId", "assignedAt")
SELECT "representationId", "choreographyId", "assignedAt"
FROM "ChoreographyRepresentation";

ALTER TABLE "AvailabilityResponse" ADD COLUMN "eventId" TEXT;
UPDATE "AvailabilityResponse" SET "eventId" = "repetitionEventId";
ALTER TABLE "AvailabilityResponse" ALTER COLUMN "eventId" SET NOT NULL;

ALTER TABLE "AvailabilityResponse" DROP CONSTRAINT "AvailabilityResponse_repetitionEventId_fkey";
DROP INDEX "AvailabilityResponse_repetitionEventId_userId_key";
ALTER TABLE "AvailabilityResponse" DROP COLUMN "repetitionEventId";
CREATE UNIQUE INDEX "AvailabilityResponse_eventId_userId_key" ON "AvailabilityResponse"("eventId", "userId");

DROP TABLE "ChoreographyRepresentation";
DROP TABLE "Representation";
DROP TABLE "RepetitionEvent";

CREATE INDEX "Event_typeId_idx" ON "Event"("typeId");
CREATE INDEX "Event_choreographyId_idx" ON "Event"("choreographyId");
CREATE INDEX "Event_groupId_idx" ON "Event"("groupId");
CREATE INDEX "EventChoreography_choreographyId_idx" ON "EventChoreography"("choreographyId");

ALTER TABLE "Event" ADD CONSTRAINT "Event_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_choreographyId_fkey" FOREIGN KEY ("choreographyId") REFERENCES "Choreography"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChoreographyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventChoreography" ADD CONSTRAINT "EventChoreography_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventChoreography" ADD CONSTRAINT "EventChoreography_choreographyId_fkey" FOREIGN KEY ("choreographyId") REFERENCES "Choreography"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AvailabilityResponse" ADD CONSTRAINT "AvailabilityResponse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
