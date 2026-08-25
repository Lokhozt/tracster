-- CreateTable
CREATE TABLE "UserUnavailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserUnavailability_userId_startsAt_idx" ON "UserUnavailability"("userId", "startsAt");

-- AddForeignKey
ALTER TABLE "UserUnavailability" ADD CONSTRAINT "UserUnavailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
