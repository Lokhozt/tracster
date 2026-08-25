import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import {
  getChoreographyGroups,
  serializeGroup,
  validateGroupMemberIds,
} from "@/lib/groups";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { groupSchema } from "@/lib/validations";

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

  const groups = await getChoreographyGroups(id);

  return Response.json({
    groups: groups.map(serializeGroup),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const choreography = await prisma.choreography.findUnique({ where: { id } });
  if (!choreography) {
    return notFound("Choreography");
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

  const group = await prisma.choreographyGroup.create({
    data: {
      choreographyId: id,
      name: parsed.data.name,
      members: {
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

  return Response.json({ group: serializeGroup(group) }, { status: 201 });
}
