CREATE TYPE "DisplayLanguage" AS ENUM ('ENGLISH', 'FRENCH');

ALTER TABLE "User" ADD COLUMN "displayLanguage" "DisplayLanguage";
