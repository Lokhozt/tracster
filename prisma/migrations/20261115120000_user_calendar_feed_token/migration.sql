ALTER TABLE "User" ADD COLUMN "calendarFeedToken" TEXT;

CREATE UNIQUE INDEX "User_calendarFeedToken_key" ON "User"("calendarFeedToken");
