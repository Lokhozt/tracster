export type OriginRequest = { nextUrl: URL; headers: Headers };

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

  const host = request.headers.get("host")?.split(",")[0]?.trim();
  if (host) {
    return `${request.nextUrl.protocol.replace(":", "")}://${host}`;
  }

  return request.nextUrl.origin;
}
