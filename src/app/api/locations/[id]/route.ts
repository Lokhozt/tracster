import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { findLocationByName, snapshotLocationUsage } from "@/lib/locations";
import { canManageSettings } from "@/lib/roles";
import { locationSchema } from "@/lib/validations";
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
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return notFound("Location");
  }

  const body = await request.json();
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const duplicate = await findLocationByName(parsed.data.name, id);
  if (duplicate) {
    return jsonError("A location with this name already exists.", 409);
  }
  const affectedEvents = await prisma.event.findMany({
    where: { locationId: id, startsAt: { gte: new Date() } },
    select: { id: true },
  });

  const location = await prisma.location.update({
    where: { id },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });
  await Promise.all(affectedEvents.map(({ id: eventId }) => syncGoogleEventBestEffort(eventId)));

  return Response.json({ location });
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
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return notFound("Location");
  }
  const affectedEvents = await prisma.event.findMany({
    where: { locationId: id, startsAt: { gte: new Date() } },
    select: { id: true },
  });

  await snapshotLocationUsage(id, existing.name);
  await prisma.location.delete({ where: { id } });
  await Promise.all(affectedEvents.map(({ id: eventId }) => syncGoogleEventBestEffort(eventId)));

  return Response.json({ ok: true });
}
