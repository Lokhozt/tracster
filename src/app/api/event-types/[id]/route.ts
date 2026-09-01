import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canManageSettings } from "@/lib/roles";
import { eventTypeSchema } from "@/lib/validations";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await canManageSettings(user.id))) {
    return forbidden();
  }

  const { id } = await context.params;
  const existing = await prisma.eventType.findUnique({ where: { id } });
  if (!existing) {
    return notFound("Event type");
  }

  if (existing.immutable) {
    return jsonError("Built-in event types cannot be edited.");
  }

  const body = await request.json();
  const parsed = eventTypeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const duplicate = await prisma.eventType.findFirst({
    where: {
      name: { equals: parsed.data.name, mode: "insensitive" },
      id: { not: id },
    },
  });
  if (duplicate) {
    return jsonError("An event type with this name already exists.", 409);
  }

  const eventType = await prisma.eventType.update({
    where: { id },
    data: { name: parsed.data.name },
    select: { id: true, name: true, kind: true, immutable: true, sortOrder: true },
  });
  const affectedEvents = await prisma.event.findMany({
    where: { typeId: id, startsAt: { gte: new Date() } },
    select: { id: true },
  });
  await Promise.all(affectedEvents.map(({ id: eventId }) => syncGoogleEventBestEffort(eventId)));

  return Response.json({ eventType });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await canManageSettings(user.id))) {
    return forbidden();
  }

  const { id } = await context.params;
  const existing = await prisma.eventType.findUnique({
    where: { id },
    include: { _count: { select: { events: true } } },
  });
  if (!existing) {
    return notFound("Event type");
  }

  if (existing.immutable) {
    return jsonError("Built-in event types cannot be deleted.");
  }

  if (existing._count.events > 0) {
    return jsonError("This event type is in use and cannot be deleted.");
  }

  await prisma.eventType.delete({ where: { id } });
  return Response.json({ ok: true });
}
