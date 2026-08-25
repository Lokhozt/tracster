import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { getGroupForChoreography, serializeGroup, validateGroupMemberIds } from "@/lib/groups";
import { canEditChoreography } from "@/lib/permissions";
import { groupSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string; groupId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id, groupId } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const existingGroup = await getGroupForChoreography(id, groupId);
  if (!existingGroup) {
    return notFound("Group");
  }

  const body = await request.json();
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const memberError = await validateGroupMemberIds(id, parsed.data.memberIds);
  if (memberError) {
    return jsonError(memberError);
  }

  const uniqueMemberIds = [...new Set(parsed.data.memberIds)];

  const group = await prisma.choreographyGroup.update({
    where: { id: groupId },
    data: {
      name: parsed.data.name,
      members: {
        deleteMany: {},
        create: uniqueMemberIds.map((userId) => ({ userId })),
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      },
    },
  });

  return Response.json({ group: serializeGroup(group) });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id, groupId } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const existingGroup = await getGroupForChoreography(id, groupId);
  if (!existingGroup) {
    return notFound("Group");
  }

  await prisma.choreographyGroup.delete({ where: { id: groupId } });

  return Response.json({ ok: true });
}
