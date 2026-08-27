import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { canManageSettings } from "@/lib/roles";
import { eventTypeSchema } from "@/lib/validations";
import { getEventTypes } from "@/lib/event-types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const eventTypes = await getEventTypes();
  return Response.json({ eventTypes });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await canManageSettings(user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = eventTypeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const existing = await prisma.eventType.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (existing) {
    return jsonError("An event type with this name already exists.", 409);
  }

  const last = await prisma.eventType.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const eventType = await prisma.eventType.create({
    data: {
      name: parsed.data.name,
      kind: null,
      immutable: false,
      sortOrder: (last?.sortOrder ?? 10) + 1,
    },
    select: { id: true, name: true, kind: true, immutable: true, sortOrder: true },
  });

  return Response.json({ eventType }, { status: 201 });
}
