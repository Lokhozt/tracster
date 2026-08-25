import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, notFound, unauthorized } from "@/lib/api";
import { canViewChoreography } from "@/lib/permissions";
import { basicUserSelect } from "@/lib/users";

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
