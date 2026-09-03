import { NextResponse } from "next/server";
import { getServerTranslator, translateMessageWith } from "@/i18n/server";

export async function jsonError(message: string, status = 400) {
  const translated = translateMessageWith(await getServerTranslator(), message);
  return NextResponse.json({ error: translated }, { status });
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
