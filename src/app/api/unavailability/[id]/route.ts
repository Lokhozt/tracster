import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canManageUserUnavailability } from "@/lib/roles";
import {
  saveMergedUnavailability,
  serializeUnavailability,
  validateUnavailabilityRange,
} from "@/lib/unavailability";
import { unavailabilitySchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

async function getEditableUnavailability(actorId: string, id: string) {
  const existing = await prisma.userUnavailability.findUnique({ where: { id } });
  if (!existing) {
    return { error: await notFound("Unavailability") };
  }
  if (!(await canManageUserUnavailability(actorId, existing.userId))) {
    return { error: await forbidden() };
  }
  return { existing };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const resolved = await getEditableUnavailability(user.id, id);
  if ("error" in resolved) {
    return resolved.error;
  }

  const parsed = unavailabilitySchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  const rangeError = validateUnavailabilityRange(startsAt, endsAt);
  if (rangeError) {
    return jsonError(rangeError);
  }

  const { entry, deletedIds } = await saveMergedUnavailability(
    resolved.existing.userId,
    startsAt,
    endsAt,
    id,
  );

  return Response.json({ timeframe: serializeUnavailability(entry), deletedIds });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const resolved = await getEditableUnavailability(user.id, id);
  if ("error" in resolved) {
    return resolved.error;
  }

  await prisma.userUnavailability.delete({ where: { id } });
  return Response.json({ ok: true });
}
