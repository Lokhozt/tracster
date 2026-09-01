import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { connectionIdFor, listConnectionCalendars } from "@/lib/google-calendar";
import { canManageSettings } from "@/lib/roles";

export async function GET(request: NextRequest) {
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
    const calendars = await listConnectionCalendars(
      connectionIdFor(kind === "association" ? "ASSOCIATION" : "USER", user.id),
    );
    return Response.json({ calendars });
  } catch (error) {
    console.error("Unable to list Google calendars", error);
    return jsonError("Unable to load Google calendars.", 502);
  }
}
