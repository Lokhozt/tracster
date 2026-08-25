-- CreateTable
CREATE TABLE "Representation" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Representation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreographyRepresentation" (
    "choreographyId" TEXT NOT NULL,
    "representationId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreographyRepresentation_pkey" PRIMARY KEY ("choreographyId","representationId")
);

-- Migrate data from RepresentationDate
INSERT INTO "Representation" ("id", "title", "startsAt", "endsAt", "location", "notes", "createdById", "createdAt", "updatedAt")
SELECT "id", "title", "startsAt", "endsAt", "location", "notes", "createdById", "createdAt", "updatedAt"
FROM "RepresentationDate";

INSERT INTO "ChoreographyRepresentation" ("choreographyId", "representationId", "assignedAt")
SELECT "choreographyId", "id", "createdAt"
FROM "RepresentationDate";

-- DropTable
DROP TABLE "RepresentationDate";

-- AddForeignKey
ALTER TABLE "Representation" ADD CONSTRAINT "Representation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreographyRepresentation" ADD CONSTRAINT "ChoreographyRepresentation_choreographyId_fkey" FOREIGN KEY ("choreographyId") REFERENCES "Choreography"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreographyRepresentation" ADD CONSTRAINT "ChoreographyRepresentation_representationId_fkey" FOREIGN KEY ("representationId") REFERENCES "Representation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
