import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/api";
import {
  getUserUnavailabilityInRange,
  saveMergedUnavailability,
  serializeUnavailability,
  validateUnavailabilityRange,
} from "@/lib/unavailability";
import { unavailabilityRangeSchema, unavailabilitySchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const parsed = unavailabilityRangeSchema.safeParse({
    from: fromParam,
    to: toParam,
  });

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid range.");
  }

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);

  if (to <= from) {
    return jsonError("Range end must be after range start.");
  }

  const entries = await getUserUnavailabilityInRange(user.id, from, to);

  return Response.json({
    timeframes: entries.map(serializeUnavailability),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
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

  const { entry, deletedIds } = await saveMergedUnavailability(user.id, startsAt, endsAt);

  return Response.json(
    { timeframe: serializeUnavailability(entry), deletedIds },
    { status: 201 },
  );
}
