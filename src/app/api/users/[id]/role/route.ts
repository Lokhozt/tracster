import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canChangeUserRole } from "@/lib/roles";
import { updateUserRoleSchema } from "@/lib/validations";
import { adminUserSelect, serializeAdminUser } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  const body = await request.json();
  const parsed = updateUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  if (!(await canChangeUserRole(user.id, id, parsed.data.role))) {
    return forbidden();
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return notFound("User");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: adminUserSelect,
  });

  return Response.json({ user: serializeAdminUser(updated) });
}
