-- AlterTable
ALTER TABLE "EventChoreography" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "EventChoreography_groupId_idx" ON "EventChoreography"("groupId");

-- AddForeignKey
ALTER TABLE "EventChoreography" ADD CONSTRAINT "EventChoreography_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChoreographyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
