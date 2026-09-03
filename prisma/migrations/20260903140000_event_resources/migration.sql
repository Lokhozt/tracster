-- CreateEnum
CREATE TYPE "EventResourceType" AS ENUM ('LINK', 'FILE');

-- CreateEnum
CREATE TYPE "EventResourceVisibility" AS ENUM ('CHOREOGRAPHER', 'PARTICIPANT', 'ALL');

-- CreateEnum
CREATE TYPE "EventResourceStatus" AS ENUM ('PENDING', 'ACTIVE');

-- CreateTable
CREATE TABLE "EventResource" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "type" "EventResourceType" NOT NULL,
    "visibility" "EventResourceVisibility" NOT NULL DEFAULT 'ALL',
    "status" "EventResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "url" TEXT,
    "storageKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventResource_storageKey_key" ON "EventResource"("storageKey");

-- CreateIndex
CREATE INDEX "EventResource_eventId_status_createdAt_idx" ON "EventResource"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EventResource_uploadedById_idx" ON "EventResource"("uploadedById");

-- AddForeignKey
ALTER TABLE "EventResource" ADD CONSTRAINT "EventResource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventResource" ADD CONSTRAINT "EventResource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
