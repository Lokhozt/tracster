import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canManageSettings } from "@/lib/roles";
import { serializeTag } from "@/lib/tags";
import { tagSchema } from "@/lib/validations";

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
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) {
    return notFound("Tag");
  }

  const body = await request.json();
  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const duplicate = await prisma.tag.findFirst({
    where: {
      name: { equals: parsed.data.name, mode: "insensitive" },
      id: { not: id },
    },
  });
  if (duplicate) {
    return jsonError("A tag with this name already exists.", 409);
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      name: parsed.data.name,
      color: parsed.data.color.toLowerCase(),
    },
    select: { id: true, name: true, color: true },
  });

  return Response.json({ tag: serializeTag(tag) });
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
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) {
    return notFound("Tag");
  }

  await prisma.tag.delete({ where: { id } });
  return Response.json({ ok: true });
}
