import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { canManageSettings } from "@/lib/roles";
import {
  getSiteSettings,
  serializeSiteSettings,
  SITE_SETTINGS_ID,
} from "@/lib/site-settings";
import { siteSettingsSchema } from "@/lib/validations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const settings = await getSiteSettings();
  return Response.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await canManageSettings(user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = siteSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: {
      id: SITE_SETTINGS_ID,
      ...parsed.data,
    },
    update: parsed.data,
  });

  return Response.json({ settings: serializeSiteSettings(settings) });
}
