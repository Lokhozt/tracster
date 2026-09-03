import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { defaultEventTitle } from "@/lib/event-type-helpers";

export type GoogleConnectionKind = "ASSOCIATION" | "USER";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API_URL = "https://www.googleapis.com";
const ASSOCIATION_CONNECTION_ID = "google-calendar-association";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
};

type GoogleEventResponse = {
  id: string;
};

class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function googleClientConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth is not configured.");
  }
  return { clientId, clientSecret };
}

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
      process.env.SESSION_SECRET,
  );
}

const DEFAULT_ASSOCIATION_CALENDAR_TIMEZONE = "Europe/Paris";

export function associationCalendarFollowUrl() {
  const configured = process.env.GOOGLE_ASSOCIATION_CALENDAR_ID?.trim();
  if (!configured) {
    return null;
  }

  if (/^https?:\/\//i.test(configured)) {
    return configured;
  }

  const timezone =
    process.env.GOOGLE_ASSOCIATION_CALENDAR_TIMEZONE?.trim() ||
    DEFAULT_ASSOCIATION_CALENDAR_TIMEZONE;
  const parameters = new URLSearchParams({
    src: configured,
    ctz: timezone,
  });
  return `https://calendar.google.com/calendar/embed?${parameters.toString()}`;
}

type OriginRequest = { nextUrl: URL; headers: Headers };

// Behind a proxy the request URL carries the internal host, so prefer the public origin.
export function appOrigin(request: OriginRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && process.env.NODE_ENV === "production") {
    return configured;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? request.nextUrl.protocol.replace(":", "");
    return `${protocol}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

export function googleOAuthRedirectUri(request: OriginRequest) {
  return `${appOrigin(request)}/api/google-calendar/callback`;
}

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required to protect Google refresh tokens.");
  }
  return createHash("sha256").update(secret).digest();
}

function encryptRefreshToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptRefreshToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored Google refresh token is invalid.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function googleJson<T>(
  url: string,
  init: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, ...requestInit } = init;
  const response = await fetch(url, {
    ...requestInit,
    headers: {
      ...(requestInit.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...requestInit.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new GoogleApiError(`Google Calendar API returned ${response.status}: ${body}`, response.status);
  }
  return (await response.json()) as T;
}

export function googleAuthorizationUrl(options: {
  redirectUri: string;
  state: string;
  loginHint?: string;
}) {
  const { clientId } = googleClientConfig();
  const parameters = new URLSearchParams({
    client_id: clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    state: options.state,
    scope: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    ].join(" "),
  });
  if (options.loginHint) {
    parameters.set("login_hint", options.loginHint);
  }
  return `${GOOGLE_AUTH_URL}?${parameters}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = googleClientConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !tokens.refresh_token || !tokens.access_token) {
    throw new Error(tokens.error_description ?? tokens.error ?? "Google did not return a refresh token.");
  }
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
}

async function accessToken(encryptedRefreshToken: string) {
  const { clientId, clientSecret } = googleClientConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: decryptRefreshToken(encryptedRefreshToken),
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const tokens = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !tokens.access_token) {
    throw new Error(tokens.error_description ?? tokens.error ?? "Unable to refresh Google access.");
  }
  return tokens.access_token;
}

export async function listGoogleCalendarsWithToken(token: string) {
  const response = await googleJson<{ items?: GoogleCalendarListEntry[] }>(
    `${GOOGLE_API_URL}/calendar/v3/users/me/calendarList`,
    { accessToken: token },
  );
  return (response.items ?? [])
    .filter((calendar) => calendar.accessRole === "owner" || calendar.accessRole === "writer")
    .map((calendar) => ({
      id: calendar.id,
      name: calendar.summary,
      primary: Boolean(calendar.primary),
    }));
}

export async function getGoogleAccountEmail(token: string) {
  const profile = await googleJson<{ email?: string }>(
    `${GOOGLE_API_URL}/oauth2/v2/userinfo`,
    { accessToken: token },
  );
  return profile.email;
}

export async function listConnectionCalendars(connectionId: string) {
  const connection = await prisma.googleCalendarConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });
  return listGoogleCalendarsWithToken(await accessToken(connection.encryptedRefreshToken));
}

export function connectionIdFor(kind: GoogleConnectionKind, userId: string) {
  return kind === "ASSOCIATION" ? ASSOCIATION_CONNECTION_ID : `google-calendar-user-${userId}`;
}

export async function saveGoogleConnection(options: {
  kind: GoogleConnectionKind;
  userId: string;
  refreshToken: string;
  accessToken: string;
  accountEmail?: string;
}) {
  const calendars = await listGoogleCalendarsWithToken(options.accessToken);
  const selected = calendars.find((calendar) => calendar.primary) ?? calendars[0];
  if (!selected) {
    throw new Error("This Google account has no writable calendars.");
  }
  const id = connectionIdFor(options.kind, options.userId);
  if (await prisma.googleCalendarConnection.findUnique({ where: { id }, select: { id: true } })) {
    await disconnectGoogleCalendar(id);
  }
  const connection = await prisma.googleCalendarConnection.upsert({
    where: { id },
    update: {
      kind: options.kind,
      userId: options.kind === "USER" ? options.userId : null,
      encryptedRefreshToken: encryptRefreshToken(options.refreshToken),
      calendarId: selected.id,
      calendarName: selected.name,
      accountEmail: options.accountEmail,
      lastSyncError: null,
    },
    create: {
      id,
      kind: options.kind,
      userId: options.kind === "USER" ? options.userId : null,
      encryptedRefreshToken: encryptRefreshToken(options.refreshToken),
      calendarId: selected.id,
      calendarName: selected.name,
      accountEmail: options.accountEmail,
    },
  });
  try {
    await syncGoogleConnection(connection.id);
  } catch {
    // The connection is valid; the recorded error can be retried from the UI.
  }
  return connection;
}

const eventInclude = {
  type: { select: { name: true, kind: true } },
  ...listedLocationInclude,
  choreography: {
    select: {
      title: true,
      createdById: true,
      choreographers: { select: { userId: true } },
      members: { select: { userId: true } },
    },
  },
  group: {
    select: {
      name: true,
      members: { select: { userId: true } },
    },
  },
} as const;

type SyncEvent = NonNullable<Awaited<ReturnType<typeof getSyncEvent>>>;

function getSyncEvent(eventId: string) {
  return prisma.event.findUnique({ where: { id: eventId }, include: eventInclude });
}

function rehearsalAudience(event: SyncEvent) {
  if (!event.choreography) {
    return [];
  }
  const ids = new Set([
    event.choreography.createdById,
    ...event.choreography.choreographers.map(({ userId }) => userId),
    ...(event.group
      ? event.group.members.map(({ userId }) => userId)
      : event.choreography.members.map(({ userId }) => userId)),
  ]);
  return [...ids];
}

function googleEventPayload(event: SyncEvent) {
  const isRehearsal = event.type.kind === "REHEARSAL";
  const choreography = event.choreography?.title;
  const group = event.group?.name;
  const summary =
    event.title.trim() ||
    (isRehearsal
      ? ["Rehearsal", choreography, group].filter(Boolean).join(" · ")
      : defaultEventTitle(event.type, event.title));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const details = isRehearsal ? event.notes : event.description;
  const description = [details, appUrl ? `${appUrl}/events/${event.id}` : null]
    .filter(Boolean)
    .join("\n\n");
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + 60 * 60 * 1000);
  return {
    summary,
    description: description || undefined,
    location: displayLocation(event) ?? undefined,
    start: { dateTime: event.startsAt.toISOString() },
    end: { dateTime: end.toISOString() },
    extendedProperties: { private: { tracsterEventId: event.id } },
  };
}

async function deleteMapping(mapping: {
  id: string;
  googleEventId: string;
  connection: { calendarId: string; encryptedRefreshToken: string };
}) {
  const token = await accessToken(mapping.connection.encryptedRefreshToken);
  const response = await fetch(
    `${GOOGLE_API_URL}/calendar/v3/calendars/${encodeURIComponent(mapping.connection.calendarId)}/events/${encodeURIComponent(mapping.googleEventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new GoogleApiError(await response.text(), response.status);
  }
  await prisma.googleCalendarEvent.deleteMany({ where: { id: mapping.id } });
}

async function upsertMapping(
  event: SyncEvent,
  connection: {
    id: string;
    calendarId: string;
    encryptedRefreshToken: string;
  },
) {
  const mapping = await prisma.googleCalendarEvent.findUnique({
    where: {
      connectionId_tracsterEventId: {
        connectionId: connection.id,
        tracsterEventId: event.id,
      },
    },
  });
  const token = await accessToken(connection.encryptedRefreshToken);
  const baseUrl = `${GOOGLE_API_URL}/calendar/v3/calendars/${encodeURIComponent(connection.calendarId)}/events`;
  const body = JSON.stringify(googleEventPayload(event));

  if (mapping) {
    try {
      await googleJson<GoogleEventResponse>(
        `${baseUrl}/${encodeURIComponent(mapping.googleEventId)}`,
        { method: "PATCH", body, accessToken: token },
      );
      return;
    } catch (error) {
      if (!(error instanceof GoogleApiError) || (error.status !== 404 && error.status !== 410)) {
        throw error;
      }
    }
  }

  const created = await googleJson<GoogleEventResponse>(baseUrl, {
    method: "POST",
    body,
    accessToken: token,
  });
  await prisma.googleCalendarEvent.upsert({
    where: {
      connectionId_tracsterEventId: {
        connectionId: connection.id,
        tracsterEventId: event.id,
      },
    },
    update: { eventId: event.id, googleEventId: created.id },
    create: {
      connectionId: connection.id,
      eventId: event.id,
      tracsterEventId: event.id,
      googleEventId: created.id,
    },
  });
}

async function recordSyncResult(connectionId: string, error?: unknown) {
  await prisma.googleCalendarConnection.updateMany({
    where: { id: connectionId },
    data: {
      lastSyncedAt: error ? undefined : new Date(),
      lastSyncError: error instanceof Error ? error.message.slice(0, 1000) : error ? String(error) : null,
    },
  });
}

export async function syncGoogleEvent(eventId: string) {
  const event = await getSyncEvent(eventId);
  if (!event) {
    const orphaned = await prisma.googleCalendarEvent.findMany({
      where: { tracsterEventId: eventId },
      include: { connection: true },
    });
    await Promise.all(orphaned.map(deleteMapping));
    return;
  }

  if (event.type.kind !== "REHEARSAL") {
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { id: ASSOCIATION_CONNECTION_ID },
    });
    if (connection) {
      try {
        await upsertMapping(event, connection);
        await recordSyncResult(connection.id);
      } catch (error) {
        await recordSyncResult(connection.id, error);
        throw error;
      }
    }
    const userMappings = await prisma.googleCalendarEvent.findMany({
      where: { eventId, connection: { kind: "USER" } },
      include: { connection: true },
    });
    await Promise.all(userMappings.map(deleteMapping));
    return;
  }

  const userIds = rehearsalAudience(event);
  const desiredConnections = await prisma.googleCalendarConnection.findMany({
    where: { kind: "USER", userId: { in: userIds } },
  });
  const desiredIds = new Set(desiredConnections.map(({ id }) => id));
  const staleMappings = await prisma.googleCalendarEvent.findMany({
    where: {
      eventId,
      connection: { kind: "USER" },
      connectionId: { notIn: [...desiredIds] },
    },
    include: { connection: true },
  });
  await Promise.all(staleMappings.map(deleteMapping));
  await Promise.all(
    desiredConnections.map(async (connection) => {
      try {
        await upsertMapping(event, connection);
        await recordSyncResult(connection.id);
      } catch (error) {
        await recordSyncResult(connection.id, error);
      }
    }),
  );
}

export async function syncGoogleEventBestEffort(eventId: string) {
  try {
    await syncGoogleEvent(eventId);
  } catch (error) {
    console.error("Google Calendar sync failed", error);
  }
}

export async function syncGoogleConnection(connectionId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) {
    return;
  }
  try {
    const now = new Date();
    const events =
      connection.kind === "ASSOCIATION"
        ? await prisma.event.findMany({
            where: { startsAt: { gte: now }, type: { kind: { not: "REHEARSAL" } } },
            select: { id: true },
          })
        : await prisma.event.findMany({
            where: {
              startsAt: { gte: now },
              type: { kind: "REHEARSAL" },
              OR: [
                { choreography: { createdById: connection.userId ?? "" } },
                {
                  choreography: {
                    choreographers: { some: { userId: connection.userId ?? "" } },
                  },
                },
                {
                  groupId: null,
                  choreography: { members: { some: { userId: connection.userId ?? "" } } },
                },
                { group: { members: { some: { userId: connection.userId ?? "" } } } },
              ],
            },
            select: { id: true },
          });
    const desiredIds = new Set(events.map(({ id }) => id));
    const existingMappings = await prisma.googleCalendarEvent.findMany({
      where: { connectionId },
      include: {
        connection: true,
        event: { select: { startsAt: true } },
      },
    });
    const staleMappings = existingMappings.filter(
      (mapping) =>
        !mapping.event ||
        (mapping.event.startsAt >= now && !desiredIds.has(mapping.tracsterEventId)),
    );
    for (const mapping of staleMappings) {
      await deleteMapping(mapping);
    }
    for (const event of events) {
      await syncGoogleEvent(event.id);
    }
    await recordSyncResult(connection.id);
  } catch (error) {
    await recordSyncResult(connection.id, error);
    throw error;
  }
}

export async function syncChoreographyRehearsals(choreographyId: string) {
  const rehearsals = await prisma.event.findMany({
    where: { choreographyId, type: { kind: "REHEARSAL" }, startsAt: { gte: new Date() } },
    select: { id: true },
  });
  for (const rehearsal of rehearsals) {
    await syncGoogleEventBestEffort(rehearsal.id);
  }
}

export async function changeConnectionCalendar(
  connectionId: string,
  calendar: { id: string; name: string },
) {
  const mappings = await prisma.googleCalendarEvent.findMany({
    where: { connectionId },
    include: { connection: true },
  });
  for (const mapping of mappings) {
    await deleteMapping(mapping);
  }
  await prisma.googleCalendarConnection.update({
    where: { id: connectionId },
    data: { calendarId: calendar.id, calendarName: calendar.name, lastSyncError: null },
  });
  await syncGoogleConnection(connectionId);
}

export async function disconnectGoogleCalendar(connectionId: string) {
  const mappings = await prisma.googleCalendarEvent.findMany({
    where: { connectionId },
    include: { connection: true },
  });
  for (const mapping of mappings) {
    try {
      await deleteMapping(mapping);
    } catch {
      // Disconnect must still remove locally stored access if Google revoked it first.
    }
  }
  await prisma.googleCalendarConnection.deleteMany({ where: { id: connectionId } });
}

export function serializeGoogleConnection(
  connection: {
    calendarId: string;
    calendarName: string;
    accountEmail: string | null;
    lastSyncedAt: Date | null;
    lastSyncError: string | null;
  } | null,
) {
  if (!connection) {
    return null;
  }
  return {
    calendarId: connection.calendarId,
    calendarName: connection.calendarName,
    accountEmail: connection.accountEmail,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    lastSyncError: connection.lastSyncError,
  };
}
