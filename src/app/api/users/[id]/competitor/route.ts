import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canManageUsers } from "@/lib/roles";
import { competitorStatusSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  if (user.id !== id && !(await canManageUsers(user.id))) {
    return forbidden();
  }

  const parsed = competitorStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return notFound("User");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isCompetitor: parsed.data.isCompetitor },
    select: { isCompetitor: true },
  });

  return Response.json({ isCompetitor: updated.isCompetitor });
}
