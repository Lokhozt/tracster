import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canManageChoreographyTags, canViewChoreography } from "@/lib/permissions";
import { serializeTag } from "@/lib/tags";
import { choreographyTagsSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  if (!(await canViewChoreography(id, user.id))) {
    return forbidden();
  }

  const choreography = await prisma.choreography.findUnique({
    where: { id },
    select: {
      tags: {
        include: { tag: { select: { id: true, name: true, color: true } } },
        orderBy: { tag: { name: "asc" } },
      },
    },
  });
  if (!choreography) {
    return notFound("Choreography");
  }

  return Response.json({
    tags: choreography.tags.map((item) => serializeTag(item.tag)),
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  if (!(await canManageChoreographyTags(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = choreographyTagsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const uniqueIds = [...new Set(parsed.data.tagIds)];
  const tags = await prisma.tag.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (tags.length !== uniqueIds.length) {
    return jsonError("One or more tags were not found.");
  }

  await prisma.$transaction([
    prisma.choreographyTag.deleteMany({ where: { choreographyId: id } }),
    ...(uniqueIds.length > 0
      ? [
          prisma.choreographyTag.createMany({
            data: uniqueIds.map((tagId) => ({ choreographyId: id, tagId })),
          }),
        ]
      : []),
  ]);

  const assigned = await prisma.choreographyTag.findMany({
    where: { choreographyId: id },
    include: { tag: { select: { id: true, name: true, color: true } } },
    orderBy: { tag: { name: "asc" } },
  });

  return Response.json({ tags: assigned.map((item) => serializeTag(item.tag)) });
}
