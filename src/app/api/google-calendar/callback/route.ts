import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  exchangeGoogleCode,
  getGoogleAccountEmail,
  saveGoogleConnection,
} from "@/lib/google-calendar";
import { canManageSettings } from "@/lib/roles";

const OAUTH_STATE_COOKIE = "tracster_google_calendar_oauth_state";

function resultRedirect(request: NextRequest, kind: "association" | "user", result: string) {
  const destination = kind === "association" ? "/settings" : "/account";
  const url = new URL(destination, request.url);
  url.searchParams.set("googleCalendar", result);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const kind = state?.startsWith("association:")
    ? "association"
    : state?.startsWith("user:")
      ? "user"
      : null;

  if (!user || !state || !kind || state !== expectedState) {
    return resultRedirect(request, kind ?? "user", "invalid-state");
  }
  if (kind === "association" && !(await canManageSettings(user.id))) {
    return resultRedirect(request, kind, "forbidden");
  }
  if (request.nextUrl.searchParams.get("error")) {
    return resultRedirect(request, kind, "cancelled");
  }
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return resultRedirect(request, kind, "missing-code");
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
    const tokens = await exchangeGoogleCode(code, `${appUrl}/api/google-calendar/callback`);
    await saveGoogleConnection({
      kind: kind === "association" ? "ASSOCIATION" : "USER",
      userId: user.id,
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      accountEmail: await getGoogleAccountEmail(tokens.accessToken),
    });
    return resultRedirect(request, kind, "connected");
  } catch (error) {
    console.error("Unable to connect Google Calendar", error);
    return resultRedirect(request, kind, "error");
  }
}
