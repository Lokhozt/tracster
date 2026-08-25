import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { registerSchema } from "@/lib/validations";
import { serializeBasicUser } from "@/lib/users";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { firstName, lastName, email, phone, dateOfBirth, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("An account with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      passwordHash,
    },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  await createSession(user.id);

  return Response.json({ user: serializeBasicUser(user) });
}
