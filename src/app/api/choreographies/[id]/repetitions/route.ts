import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { repetitionSchema } from "@/lib/validations";
import { canEditChoreography } from "@/lib/permissions";
import { basicUserSelect } from "@/lib/users";

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

  const choreography = await prisma.choreography.findUnique({ where: { id } });
  if (!choreography) {
    return notFound("Choreography");
  }

  const body = await request.json();
  const parsed = repetitionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const repetition = await prisma.repetitionEvent.create({
    data: {
      choreographyId: id,
      createdById: user.id,
      title: parsed.data.title,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      location: parsed.data.location,
      notes: parsed.data.notes,
    },
    include: {
      availabilities: {
        include: { user: { select: basicUserSelect } },
      },
    },
  });

  return Response.json({ repetition }, { status: 201 });
}
