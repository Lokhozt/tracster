import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { isOwner } from "@/lib/roles";
import { transferOwnershipSchema } from "@/lib/validations";
import { adminUserSelect, serializeAdminUser } from "@/lib/users";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isOwner(user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = transferOwnershipSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  if (parsed.data.userId === user.id) {
    return jsonError("Choose a different user to transfer ownership to.");
  }

  const newOwner = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });

  if (!newOwner) {
    return notFound("User");
  }

  const [, updatedNewOwner] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { role: "USER" },
    }),
    prisma.user.update({
      where: { id: parsed.data.userId },
      data: { role: "OWNER" },
      select: adminUserSelect,
    }),
  ]);

  return Response.json({ user: serializeAdminUser(updatedNewOwner) });
}
