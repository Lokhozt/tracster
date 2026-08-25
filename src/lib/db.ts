import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
  prismaClientVersion?: string;
};

const globalForPrisma = globalThis as PrismaGlobal;

// Bump when the Prisma schema changes so dev HMR does not keep a stale client.
const PRISMA_CLIENT_VERSION = "20260825234500_choreography_archive";

function isStalePrismaClient(client: PrismaClient | undefined): boolean {
  if (!client) {
    return false;
  }

  return (
    globalForPrisma.prismaClientVersion !== PRISMA_CLIENT_VERSION ||
    !("choreographyJoinRequest" in client) ||
    client.choreographyJoinRequest === undefined
  );
}

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  isStalePrismaClient(globalForPrisma.prisma)
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientVersion = PRISMA_CLIENT_VERSION;
}
