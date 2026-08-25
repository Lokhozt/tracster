import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canViewChoreography } from "@/lib/permissions";
import { basicUserSelect } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
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
      allowParticipantJoin: true,
      members: { where: { userId: user.id }, select: { userId: true } },
    },
  });

  if (!choreography) {
    return notFound("Choreography");
  }

  if (!choreography.allowParticipantJoin) {
    return forbidden();
  }

  if (choreography.members.length > 0) {
    return jsonError("You are already a participant.");
  }

  const member = await prisma.choreographyMember.create({
    data: {
      choreographyId: id,
      userId: user.id,
    },
    include: { user: { select: basicUserSelect } },
  });

  await prisma.choreographyJoinRequest.deleteMany({
    where: { choreographyId: id, userId: user.id },
  });

  return Response.json({ member }, { status: 201 });
}
