import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canEditUserProfile } from "@/lib/roles";
import { updateUserSchema } from "@/lib/validations";
import { adminUserSelect, serializeAdminUser } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditUserProfile(user.id, id))) {
    return forbidden();
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: adminUserSelect,
  });

  if (!target) {
    return notFound("User");
  }

  return Response.json({ user: serializeAdminUser(target) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditUserProfile(user.id, id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return notFound("User");
  }

  if (parsed.data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (emailTaken) {
      return jsonError("An account with this email already exists.", 409);
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      dateOfBirth: parsed.data.dateOfBirth
        ? new Date(parsed.data.dateOfBirth)
        : parsed.data.dateOfBirth === null
          ? null
          : undefined,
    },
    select: adminUserSelect,
  });

  return Response.json({ user: serializeAdminUser(updated) });
}
