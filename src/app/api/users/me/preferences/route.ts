import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, unauthorized } from "@/lib/api";
import { updateOwnPreferencesSchema } from "@/lib/validations";
import { LANGUAGE_COOKIE, preferenceFromLanguage } from "@/i18n/config";

/** Display language and seasonal decorations, each saved as soon as it changes (Compte). */
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const parsed = updateOwnPreferencesSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const { displayLanguage, disableSeasonalStyle } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(displayLanguage ? { displayLanguage: preferenceFromLanguage(displayLanguage) } : {}),
      ...(disableSeasonalStyle !== undefined ? { disableSeasonalStyle } : {}),
    },
    select: { displayLanguage: true, disableSeasonalStyle: true },
  });

  if (displayLanguage) {
    const cookieStore = await cookies();
    cookieStore.set(LANGUAGE_COOKIE, displayLanguage, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return Response.json({ preferences: updated });
}
