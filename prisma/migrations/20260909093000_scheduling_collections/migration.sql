-- CreateTable
CREATE TABLE "SchedulingCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "choreographyId" TEXT NOT NULL,
    "groupId" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "SchedulingCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchedulingCollection_name_key" ON "SchedulingCollection"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulingCollectionItem_collectionId_sortOrder_key" ON "SchedulingCollectionItem"("collectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "SchedulingCollectionItem_choreographyId_idx" ON "SchedulingCollectionItem"("choreographyId");

-- CreateIndex
CREATE INDEX "SchedulingCollectionItem_groupId_idx" ON "SchedulingCollectionItem"("groupId");

-- AddForeignKey
ALTER TABLE "SchedulingCollectionItem" ADD CONSTRAINT "SchedulingCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "SchedulingCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingCollectionItem" ADD CONSTRAINT "SchedulingCollectionItem_choreographyId_fkey" FOREIGN KEY ("choreographyId") REFERENCES "Choreography"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingCollectionItem" ADD CONSTRAINT "SchedulingCollectionItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChoreographyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
