import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import {
  getOwnedUnavailability,
  serializeUnavailability,
  validateUnavailabilityRange,
} from "@/lib/unavailability";
import { unavailabilitySchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const existing = await getOwnedUnavailability(id, user.id);
  if (!existing) {
    return notFound("Unavailability");
  }

  const body = await request.json();
  const parsed = unavailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  const rangeError = validateUnavailabilityRange(startsAt, endsAt);
  if (rangeError) {
    return jsonError(rangeError);
  }

  const entry = await prisma.userUnavailability.update({
    where: { id },
    data: {
      startsAt,
      endsAt,
    },
  });

  return Response.json({ timeframe: serializeUnavailability(entry) });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const existing = await getOwnedUnavailability(id, user.id);
  if (!existing) {
    return notFound("Unavailability");
  }

  await prisma.userUnavailability.delete({ where: { id } });

  return Response.json({ ok: true });
}
