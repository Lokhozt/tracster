import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { connectionIdFor, syncGoogleConnection } from "@/lib/google-calendar";
import { canManageSettings } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "association" && kind !== "user") {
    return jsonError("Invalid Google Calendar connection type.");
  }
  if (kind === "association" && !(await canManageSettings(user.id))) {
    return forbidden();
  }
  try {
    await syncGoogleConnection(
      connectionIdFor(kind === "association" ? "ASSOCIATION" : "USER", user.id),
    );
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to synchronize Google Calendar", error);
    return jsonError("Google Calendar synchronization failed.", 502);
  }
}
