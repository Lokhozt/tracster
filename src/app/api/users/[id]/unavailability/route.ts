import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canManageUserUnavailability } from "@/lib/roles";
import {
  getUserUnavailabilityInRange,
  saveMergedUnavailability,
  serializeUnavailability,
  validateUnavailabilityRange,
} from "@/lib/unavailability";
import { unavailabilityRangeSchema, unavailabilitySchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveTarget(actorId: string, targetUserId: string) {
  if (!(await canManageUserUnavailability(actorId, targetUserId))) {
    return { error: await forbidden() };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!target) {
    return { error: await notFound("User") };
  }

  return { targetId: target.id };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const resolved = await resolveTarget(user.id, id);
  if ("error" in resolved) {
    return resolved.error;
  }

  const parsed = unavailabilityRangeSchema.safeParse({
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
  });
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid range.");
  }

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  if (to <= from) {
    return jsonError("Range end must be after range start.");
  }

  const entries = await getUserUnavailabilityInRange(resolved.targetId, from, to);
  return Response.json({
    timeframes: entries.map(serializeUnavailability),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const resolved = await resolveTarget(user.id, id);
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
    resolved.targetId,
    startsAt,
    endsAt,
  );

  return Response.json(
    { timeframe: serializeUnavailability(entry), deletedIds },
    { status: 201 },
  );
}
