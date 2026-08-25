import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canViewEvent } from "@/lib/events";
import { basicUserSelect } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canViewEvent(id, user.id))) {
    return forbidden();
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      allowParticipantJoin: true,
      participants: { where: { userId: user.id }, select: { userId: true } },
    },
  });

  if (!event) {
    return notFound("Event");
  }

  if (!event.allowParticipantJoin) {
    return forbidden();
  }

  if (event.participants.length > 0) {
    return jsonError("You are already a participant.");
  }

  const participant = await prisma.eventParticipant.create({
    data: {
      eventId: id,
      userId: user.id,
    },
    include: { user: { select: basicUserSelect } },
  });

  await prisma.eventJoinRequest.deleteMany({
    where: { eventId: id, userId: user.id },
  });

  return Response.json({ participant }, { status: 201 });
}
