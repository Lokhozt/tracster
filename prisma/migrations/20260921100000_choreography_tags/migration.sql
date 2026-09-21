-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "showChoreographyTags" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreographyTag" (
    "choreographyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreographyTag_pkey" PRIMARY KEY ("choreographyId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "ChoreographyTag_tagId_idx" ON "ChoreographyTag"("tagId");

-- AddForeignKey
ALTER TABLE "ChoreographyTag" ADD CONSTRAINT "ChoreographyTag_choreographyId_fkey" FOREIGN KEY ("choreographyId") REFERENCES "Choreography"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreographyTag" ADD CONSTRAINT "ChoreographyTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
