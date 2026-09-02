import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { googleAuthorizationUrl, googleOAuthRedirectUri, isGoogleCalendarConfigured } from "@/lib/google-calendar";
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
  const redirectUri = googleOAuthRedirectUri(request);
  const response = NextResponse.redirect(
    googleAuthorizationUrl({ redirectUri, state, loginHint: user.email }),
  );
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
