import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { canHoldAdminPrivileges } from "@/lib/privileges";
import { adminPrivilegesSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!canHoldAdminPrivileges(user.role)) {
    return forbidden();
  }

  const parsed = adminPrivilegesSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { adminPrivilegesEnabled: parsed.data.enabled },
    select: { adminPrivilegesEnabled: true },
  });

  return Response.json({ adminPrivilegesEnabled: updated.adminPrivilegesEnabled });
}
