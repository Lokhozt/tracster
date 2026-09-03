import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, unauthorized } from "@/lib/api";
import { updateOwnProfileSchema } from "@/lib/validations";
import { formatUserName } from "@/lib/users";
import {
  LANGUAGE_COOKIE,
  preferenceFromLanguage,
} from "@/i18n/config";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  return Response.json({ user });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = updateOwnProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
      displayLanguage: preferenceFromLanguage(parsed.data.displayLanguage),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      dateOfBirth: true,
      role: true,
      displayLanguage: true,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(LANGUAGE_COOKIE, parsed.data.displayLanguage, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return Response.json({
    user: {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      name: formatUserName(updated),
      phone: updated.phone,
      dateOfBirth: updated.dateOfBirth?.toISOString() ?? null,
      role: updated.role,
      displayLanguage: updated.displayLanguage,
    },
  });
}
