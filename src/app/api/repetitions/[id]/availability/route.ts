import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { isRepetitionParticipant } from "@/lib/groups";
import { availabilitySchema } from "@/lib/validations";
import { basicUserSelect } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  const repetition = await prisma.repetitionEvent.findUnique({
    where: { id },
    select: {
      choreographyId: true,
      groupId: true,
      group: {
        select: {
          members: { select: { userId: true } },
        },
      },
    },
  });

  if (!repetition) {
    return notFound("Repetition");
  }

  if (!(await isRepetitionParticipant(repetition, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const availability = await prisma.availabilityResponse.upsert({
    where: {
      repetitionEventId_userId: {
        repetitionEventId: id,
        userId: user.id,
      },
    },
    update: {
      status: parsed.data.status,
      respondedAt: new Date(),
    },
    create: {
      repetitionEventId: id,
      userId: user.id,
      status: parsed.data.status,
    },
    include: { user: { select: basicUserSelect } },
  });

  return Response.json({ availability });
}
