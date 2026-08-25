import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { canCreateUserWithRole, canManageUsers } from "@/lib/roles";
import { createUserSchema } from "@/lib/validations";
import {
  adminUserSelect,
  basicUserSelect,
  serializeAdminUser,
  serializeBasicUser,
} from "@/lib/users";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (await canManageUsers(user.id)) {
    const users = await prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: adminUserSelect,
    });

    return Response.json({ users: users.map(serializeAdminUser) });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: basicUserSelect,
  });

  return Response.json({ users: users.map(serializeBasicUser) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await canManageUsers(user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const role = parsed.data.role ?? "USER";
  if (!canCreateUserWithRole(user.role, role)) {
    return forbidden();
  }

  const { firstName, lastName, email, phone, dateOfBirth, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("An account with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      passwordHash,
      role,
    },
    select: adminUserSelect,
  });

  return Response.json({ user: serializeAdminUser(created) }, { status: 201 });
}
