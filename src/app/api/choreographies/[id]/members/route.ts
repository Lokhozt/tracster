import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { assignUserSchema } from "@/lib/validations";
import { canEditChoreography } from "@/lib/permissions";
import { removeUserFromChoreographyGroups } from "@/lib/groups";
import { basicUserSelect } from "@/lib/users";
import { syncChoreographyRehearsals } from "@/lib/google-calendar";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = assignUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!targetUser) {
    return notFound("User");
  }

  const member = await prisma.choreographyMember.upsert({
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
    include: { user: { select: basicUserSelect } },
  });

  await prisma.choreographyJoinRequest.deleteMany({
    where: {
      choreographyId: id,
      userId: parsed.data.userId,
    },
  });
  await syncChoreographyRehearsals(id);

  return Response.json({ member }, { status: 201 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = assignUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await removeUserFromChoreographyGroups(id, parsed.data.userId);

  await prisma.choreographyMember.deleteMany({
    where: {
      choreographyId: id,
      userId: parsed.data.userId,
    },
  });
  await syncChoreographyRehearsals(id);

  return Response.json({ ok: true });
}
