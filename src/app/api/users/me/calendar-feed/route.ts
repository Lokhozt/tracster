import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unauthorized } from "@/lib/api";

/** Creates the calendar link's secret, or replaces it: the old link stops working. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  const token = randomBytes(24).toString("base64url");
  await prisma.user.update({ where: { id: user.id }, data: { calendarFeedToken: token } });
  return Response.json({ token });
}

/** Turns the calendar link off. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  await prisma.user.update({ where: { id: user.id }, data: { calendarFeedToken: null } });
  return Response.json({ token: null });
}
