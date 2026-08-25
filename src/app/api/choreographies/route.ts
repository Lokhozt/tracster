import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { listedChoreographyWhere } from "@/lib/participation";
import { choreographySchema } from "@/lib/validations";
import { hasGlobalAccess } from "@/lib/roles";
import { canCreateChoreography } from "@/lib/site-settings";
import { basicUserSelect } from "@/lib/users";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const globalAccess = await hasGlobalAccess(user.id);

  const choreographies = await prisma.choreography.findMany({
    where: globalAccess ? visibleChoreographyWhere : listedChoreographyWhere(user.id),
    include: {
      createdBy: { select: basicUserSelect },
      _count: { select: { members: true, repetitions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json({ choreographies });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await canCreateChoreography(user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = choreographySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const choreography = await prisma.choreography.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      createdById: user.id,
      allowParticipantJoin: parsed.data.allowParticipantJoin ?? false,
      allowJoinRequests: parsed.data.allowJoinRequests ?? false,
      hideFromNonParticipants: parsed.data.hideFromNonParticipants ?? true,
      choreographers: {
        create: { userId: user.id },
      },
    },
    include: {
      createdBy: { select: basicUserSelect },
      choreographers: {
        include: { user: { select: basicUserSelect } },
      },
      members: {
        include: { user: { select: basicUserSelect } },
      },
      repetitions: true,
    },
  });

  return Response.json({ choreography }, { status: 201 });
}
