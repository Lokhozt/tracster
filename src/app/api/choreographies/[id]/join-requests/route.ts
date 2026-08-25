import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { basicUserSelect } from "@/lib/users";
import { joinRequestDecisionSchema } from "@/lib/validations";

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
      allowJoinRequests: true,
      members: { where: { userId: user.id }, select: { userId: true } },
    },
  });

  if (!choreography) {
    return notFound("Choreography");
  }

  if (!choreography.allowJoinRequests) {
    return forbidden();
  }

  if (choreography.members.length > 0) {
    return jsonError("You are already a participant.");
  }

  const request = await prisma.choreographyJoinRequest.upsert({
    where: {
      choreographyId_userId: {
        choreographyId: id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      choreographyId: id,
      userId: user.id,
    },
    include: { user: { select: basicUserSelect } },
  });

  return Response.json({ request }, { status: 201 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = joinRequestDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const pending = await prisma.choreographyJoinRequest.findUnique({
    where: {
      choreographyId_userId: {
        choreographyId: id,
        userId: parsed.data.userId,
      },
    },
  });

  if (!pending) {
    return notFound("Join request");
  }

  if (parsed.data.action === "accept") {
    await prisma.choreographyMember.upsert({
      where: {
        choreographyId_userId: {
          choreographyId: id,
          userId: parsed.data.userId,
        },
      },
      update: {},
      create: {
        choreographyId: id,
        userId: parsed.data.userId,
      },
    });
  }

  await prisma.choreographyJoinRequest.delete({
    where: {
      choreographyId_userId: {
        choreographyId: id,
        userId: parsed.data.userId,
      },
    },
  });

  return Response.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canViewChoreography(id, user.id))) {
    return forbidden();
  }

  await prisma.choreographyJoinRequest.deleteMany({
    where: {
      choreographyId: id,
      userId: user.id,
    },
  });

  return Response.json({ ok: true });
}
