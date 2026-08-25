import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return jsonError("Authentication required.", 401);
}

export function forbidden() {
  return jsonError("You do not have permission to perform this action.", 403);
}

export function notFound(resource = "Resource") {
  return jsonError(`${resource} not found.`, 404);
}
