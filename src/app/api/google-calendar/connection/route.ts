import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import {
  changeConnectionCalendar,
  connectionIdFor,
  disconnectGoogleCalendar,
} from "@/lib/google-calendar";
import { canManageSettings } from "@/lib/roles";

async function authorizedConnection(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: unauthorized() };
  }
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "association" && kind !== "user") {
    return { error: jsonError("Invalid Google Calendar connection type.") };
  }
  if (kind === "association" && !(await canManageSettings(user.id))) {
    return { error: forbidden() };
  }
  return {
    id: connectionIdFor(kind === "association" ? "ASSOCIATION" : "USER", user.id),
  };
}

export async function PATCH(request: NextRequest) {
  const authorized = await authorizedConnection(request);
  if ("error" in authorized) {
    return authorized.error;
  }
  const body = (await request.json()) as { calendarId?: unknown; calendarName?: unknown };
  if (
    typeof body.calendarId !== "string" ||
    !body.calendarId ||
    typeof body.calendarName !== "string" ||
    !body.calendarName
  ) {
    return jsonError("Choose a Google calendar.");
  }
  try {
    await changeConnectionCalendar(authorized.id, {
      id: body.calendarId,
      name: body.calendarName,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("No record was found")) {
      return notFound("Google Calendar connection");
    }
    console.error("Unable to change Google calendar", error);
    return jsonError("Unable to change the Google calendar.", 502);
  }
}

export async function DELETE(request: NextRequest) {
  const authorized = await authorizedConnection(request);
  if ("error" in authorized) {
    return authorized.error;
  }
  await disconnectGoogleCalendar(authorized.id);
  return Response.json({ ok: true });
}
