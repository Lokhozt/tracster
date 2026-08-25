import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {
      role: "OWNER",
      firstName: "Alice",
      lastName: "Martin",
      phone: "+33 6 11 22 33 44",
      dateOfBirth: new Date("1990-03-15"),
    },
    create: {
      firstName: "Alice",
      lastName: "Martin",
      email: "alice@example.com",
      phone: "+33 6 11 22 33 44",
      dateOfBirth: new Date("1990-03-15"),
      role: "OWNER",
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {
      role: "ADMIN",
      firstName: "Bob",
      lastName: "Dupont",
      phone: "+33 6 55 66 77 88",
      dateOfBirth: new Date("1988-07-22"),
    },
    create: {
      firstName: "Bob",
      lastName: "Dupont",
      email: "bob@example.com",
      phone: "+33 6 55 66 77 88",
      dateOfBirth: new Date("1988-07-22"),
      role: "ADMIN",
      passwordHash,
    },
  });

  const claire = await prisma.user.upsert({
    where: { email: "claire@example.com" },
    update: {
      firstName: "Claire",
      lastName: "Bernard",
      phone: "+33 6 99 88 77 66",
      dateOfBirth: new Date("1995-11-08"),
    },
    create: {
      firstName: "Claire",
      lastName: "Bernard",
      email: "claire@example.com",
      phone: "+33 6 99 88 77 66",
      dateOfBirth: new Date("1995-11-08"),
      passwordHash,
    },
  });

  const choreography = await prisma.choreography.upsert({
    where: { id: "seed-choreography-1" },
    update: {},
    create: {
      id: "seed-choreography-1",
      title: "Summer Showcase",
      description: "Opening group number for the June performance.",
      createdById: alice.id,
      choreographers: {
        create: [{ userId: alice.id }, { userId: bob.id }],
      },
      members: {
        create: [{ userId: claire.id }],
      },
    },
  });

  const repetition = await prisma.repetitionEvent.upsert({
    where: { id: "seed-repetition-1" },
    update: {},
    create: {
      id: "seed-repetition-1",
      choreographyId: choreography.id,
      title: "First rehearsal",
      startsAt: new Date("2026-07-01T18:30:00"),
      endsAt: new Date("2026-07-01T20:00:00"),
      location: "Studio A",
      createdById: alice.id,
    },
  });

  await prisma.availabilityResponse.upsert({
    where: {
      repetitionEventId_userId: {
        repetitionEventId: repetition.id,
        userId: claire.id,
      },
    },
    update: { status: "AVAILABLE" },
    create: {
      repetitionEventId: repetition.id,
      userId: claire.id,
      status: "AVAILABLE",
    },
  });

  await prisma.representation.upsert({
    where: { id: "seed-representation-1" },
    update: {},
    create: {
      id: "seed-representation-1",
      title: "June showcase",
      startsAt: new Date("2026-06-28T20:00:00"),
      endsAt: new Date("2026-06-28T22:00:00"),
      location: "Main theatre",
      createdById: alice.id,
      choreographies: {
        create: { choreographyId: choreography.id },
      },
    },
  });

  await prisma.event.upsert({
    where: { id: "seed-event-1" },
    update: {},
    create: {
      id: "seed-event-1",
      title: "Association picnic",
      description: "End-of-season gathering for all members and families.",
      startsAt: new Date("2026-07-15T12:00:00"),
      endsAt: new Date("2026-07-15T16:00:00"),
      location: "Riverside park",
      createdById: alice.id,
      participants: {
        create: [{ userId: bob.id }, { userId: claire.id }],
      },
    },
  });

  console.log("Seed complete.");
  console.log("Demo accounts (password: password123):");
  console.log("- alice@example.com (owner)");
  console.log("- bob@example.com (admin)");
  console.log("- claire@example.com (participant)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
