import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isLanguage,
  LANGUAGE_COOKIE,
  preferenceFromLanguage,
} from "@/i18n/config";
import { getServerTranslator } from "@/i18n/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { language?: unknown };
  if (!isLanguage(body.language)) {
    const t = await getServerTranslator();
    return Response.json(
      { error: t("messages.Invalid language.") },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { displayLanguage: preferenceFromLanguage(body.language) },
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(LANGUAGE_COOKIE, body.language, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return Response.json({ language: body.language });
}
