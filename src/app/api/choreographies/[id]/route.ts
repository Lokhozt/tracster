import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { basicUserSelect } from "@/lib/users";
import { choreographySchema } from "@/lib/validations";

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
    include: {
      createdBy: { select: basicUserSelect },
      choreographers: {
        include: { user: { select: basicUserSelect } },
      },
      members: {
        include: { user: { select: basicUserSelect } },
      },
      repetitions: {
        orderBy: { startsAt: "asc" },
        include: {
          availabilities: {
            include: { user: { select: basicUserSelect } },
          },
        },
      },
    },
  });

  if (!choreography) {
    return notFound("Choreography");
  }

  return Response.json({ choreography });
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
  const parsed = choreographySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const choreography = await prisma.choreography.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      allowParticipantJoin: parsed.data.allowParticipantJoin ?? false,
      allowJoinRequests: parsed.data.allowJoinRequests ?? false,
      hideFromNonParticipants: parsed.data.hideFromNonParticipants ?? true,
    },
    include: {
      createdBy: { select: basicUserSelect },
    },
  });

  return Response.json({ choreography });
}
