import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { canManageSettings } from "@/lib/roles";
import { serializeTag } from "@/lib/tags";
import { tagSchema } from "@/lib/validations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });

  return Response.json({ tags: tags.map(serializeTag) });
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
  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const existing = await prisma.tag.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (existing) {
    return jsonError("A tag with this name already exists.", 409);
  }

  const tag = await prisma.tag.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color.toLowerCase(),
    },
    select: { id: true, name: true, color: true },
  });

  return Response.json({ tag: serializeTag(tag) }, { status: 201 });
}
