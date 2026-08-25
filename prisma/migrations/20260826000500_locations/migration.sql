-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- AlterTable
ALTER TABLE "RepetitionEvent" ADD COLUMN "locationId" TEXT;

-- AlterTable
ALTER TABLE "Representation" ADD COLUMN "locationId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "locationId" TEXT;

-- CreateIndex
CREATE INDEX "RepetitionEvent_locationId_idx" ON "RepetitionEvent"("locationId");

-- CreateIndex
CREATE INDEX "Representation_locationId_idx" ON "Representation"("locationId");

-- CreateIndex
CREATE INDEX "Event_locationId_idx" ON "Event"("locationId");

-- AddForeignKey
ALTER TABLE "RepetitionEvent" ADD CONSTRAINT "RepetitionEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Representation" ADD CONSTRAINT "Representation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
