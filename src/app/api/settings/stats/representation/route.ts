import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { loadRepresentationStats } from "@/lib/association-stats";
import { canManageSettings } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  if (!(await canManageSettings(user.id))) {
    return forbidden();
  }

  const eventId = request.nextUrl.searchParams.get("eventId")?.trim();
  if (!eventId) {
    return jsonError("Representation is required.");
  }

  const stats = await loadRepresentationStats(eventId);
  if (!stats) {
    return jsonError("Representation not found.");
  }

  return Response.json({ stats });
}
