-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "allowUserCreateChoreographies" BOOLEAN NOT NULL DEFAULT true,
    "allowUserCreateEvents" BOOLEAN NOT NULL DEFAULT true,
    "startOfDayHour" INTEGER NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- Seed singleton
INSERT INTO "SiteSettings" ("id", "allowUserCreateChoreographies", "allowUserCreateEvents", "startOfDayHour", "updatedAt")
VALUES ('default', true, true, 8, CURRENT_TIMESTAMP);
