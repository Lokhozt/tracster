import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { googleAuthorizationUrl, isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { canManageSettings } from "@/lib/roles";

const OAUTH_STATE_COOKIE = "tracster_google_calendar_oauth_state";

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
  if (!isGoogleCalendarConfigured()) {
    return jsonError("Google Calendar OAuth is not configured on this server.", 503);
  }

  const state = `${kind}:${randomBytes(24).toString("base64url")}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/google-calendar/callback`;
  const response = Response.redirect(
    googleAuthorizationUrl({ redirectUri, state, loginHint: user.email }),
  );
  response.headers.append(
    "Set-Cookie",
    `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return response;
}
