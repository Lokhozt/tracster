-- CreateTable
CREATE TABLE "ChoreographyGroup" (
    "id" TEXT NOT NULL,
    "choreographyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChoreographyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreographyGroupMember" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreographyGroupMember_pkey" PRIMARY KEY ("groupId","userId")
);

-- AlterTable
ALTER TABLE "RepetitionEvent" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "ChoreographyGroup_choreographyId_idx" ON "ChoreographyGroup"("choreographyId");

-- AddForeignKey
ALTER TABLE "ChoreographyGroup" ADD CONSTRAINT "ChoreographyGroup_choreographyId_fkey" FOREIGN KEY ("choreographyId") REFERENCES "Choreography"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreographyGroupMember" ADD CONSTRAINT "ChoreographyGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChoreographyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreographyGroupMember" ADD CONSTRAINT "ChoreographyGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepetitionEvent" ADD CONSTRAINT "RepetitionEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChoreographyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
