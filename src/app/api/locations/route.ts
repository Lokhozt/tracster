import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { findLocationByName } from "@/lib/locations";
import { canManageSettings } from "@/lib/roles";
import { locationSchema } from "@/lib/validations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return Response.json({ locations });
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
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const existing = await findLocationByName(parsed.data.name);
  if (existing) {
    return jsonError("A location with this name already exists.", 409);
  }

  const location = await prisma.location.create({
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });

  return Response.json({ location }, { status: 201 });
}
