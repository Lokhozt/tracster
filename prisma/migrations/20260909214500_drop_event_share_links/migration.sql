-- DropIndex
DROP INDEX IF EXISTS "Event_shareToken_key";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN IF EXISTS "shareToken";
