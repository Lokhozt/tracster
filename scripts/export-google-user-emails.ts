import "dotenv/config";
import { writeFileSync } from "fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const GOOGLE_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function isGoogleEmailAddress(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) {
    return false;
  }
  return GOOGLE_DOMAINS.has(email.slice(at + 1).toLowerCase());
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const users = await prisma.user.findMany({
    select: { email: true },
    orderBy: { email: "asc" },
  });
  const googleEmails = users.map((user) => user.email).filter(isGoogleEmailAddress);
  const output = googleEmails.join("\n") + (googleEmails.length > 0 ? "\n" : "");

  const outPath = "google-user-emails.txt";
  writeFileSync(outPath, output);
  process.stdout.write(output);
  console.error(
    `Wrote ${googleEmails.length} Google address(es) to ${outPath} (${users.length} users total).`,
  );

  await prisma.$disconnect();
}

void main();
