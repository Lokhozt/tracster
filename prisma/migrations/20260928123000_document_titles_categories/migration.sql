-- CreateTable
CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

-- Seed a category for documents created before categories were introduced.
INSERT INTO "DocumentCategory" ("id", "name", "normalizedName", "updatedAt")
VALUES ('document-category-general', 'General', 'general', CURRENT_TIMESTAMP);

-- Add nullable columns so existing rows can be backfilled.
ALTER TABLE "Document"
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "title" TEXT;

UPDATE "Document"
SET
    "categoryId" = 'document-category-general',
    "title" = COALESCE(NULLIF(BTRIM("description"), ''), "fileName", "url", 'Document');

ALTER TABLE "Document"
ALTER COLUMN "categoryId" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCategory_normalizedName_key" ON "DocumentCategory"("normalizedName");

-- CreateIndex
CREATE INDEX "DocumentCategory_name_idx" ON "DocumentCategory"("name");

-- Replace the former status index with category-aware navigation order.
DROP INDEX "Document_status_createdAt_idx";
CREATE INDEX "Document_categoryId_status_createdAt_idx" ON "Document"("categoryId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Document"
ADD CONSTRAINT "Document_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
