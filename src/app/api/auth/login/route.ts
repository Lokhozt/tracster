import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { loginSchema } from "@/lib/validations";

import { serializeBasicUser } from "@/lib/users";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return jsonError("Invalid email or password.", 401);
  }

  await createSession(user.id);

  return Response.json({
    user: serializeBasicUser(user),
  });
}
