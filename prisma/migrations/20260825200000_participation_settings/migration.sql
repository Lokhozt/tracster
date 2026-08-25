-- AlterTable
ALTER TABLE "Choreography" ADD COLUMN "allowParticipantJoin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Choreography" ADD COLUMN "allowJoinRequests" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Choreography" ADD COLUMN "hideFromNonParticipants" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "allowParticipantJoin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "allowJoinRequests" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "hideFromNonParticipants" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ChoreographyJoinRequest" (
    "choreographyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreographyJoinRequest_pkey" PRIMARY KEY ("choreographyId","userId")
);

-- CreateTable
CREATE TABLE "EventJoinRequest" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventJoinRequest_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateIndex
CREATE INDEX "ChoreographyJoinRequest_choreographyId_idx" ON "ChoreographyJoinRequest"("choreographyId");

-- CreateIndex
CREATE INDEX "EventJoinRequest_eventId_idx" ON "EventJoinRequest"("eventId");

-- AddForeignKey
ALTER TABLE "ChoreographyJoinRequest" ADD CONSTRAINT "ChoreographyJoinRequest_choreographyId_fkey" FOREIGN KEY ("choreographyId") REFERENCES "Choreography"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreographyJoinRequest" ADD CONSTRAINT "ChoreographyJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventJoinRequest" ADD CONSTRAINT "EventJoinRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventJoinRequest" ADD CONSTRAINT "EventJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
