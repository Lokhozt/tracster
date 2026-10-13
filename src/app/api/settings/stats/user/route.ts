import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { loadUserStats } from "@/lib/association-stats";
import { canManageSettings } from "@/lib/roles";
import {
  defaultAssociationStatsPeriodEnd,
  defaultAssociationStatsPeriodStart,
  parseDateInputStart,
} from "@/lib/stats-period";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  if (!(await canManageSettings(user.id))) {
    return forbidden();
  }

  const userId = request.nextUrl.searchParams.get("userId")?.trim();
  if (!userId) {
    return jsonError("User is required.");
  }

  const fromParam = request.nextUrl.searchParams.get("from")?.trim();
  const toParam = request.nextUrl.searchParams.get("to")?.trim();

  const rangeStart = fromParam
    ? parseDateInputStart(fromParam)
    : defaultAssociationStatsPeriodStart();
  if (!rangeStart) {
    return jsonError("Invalid start date.");
  }

  let rangeEnd: Date;
  if (toParam) {
    const parsedEnd = parseDateInputStart(toParam);
    if (!parsedEnd) {
      return jsonError("Invalid end date.");
    }
    rangeEnd = parsedEnd;
  } else {
    rangeEnd = defaultAssociationStatsPeriodEnd(rangeStart);
  }
  if (rangeEnd <= rangeStart) {
    return jsonError("End date must be after start date.");
  }

  const representationEventId = request.nextUrl.searchParams.get("representationEventId")?.trim();
  const stats = await loadUserStats(
    userId,
    rangeStart,
    rangeEnd,
    representationEventId || null,
  );
  if (!stats) {
    return jsonError(
      representationEventId ? "User or representation not found." : "User not found.",
    );
  }

  return Response.json({ stats });
}
