import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canEditEvent, canViewEvent } from "@/lib/events";
import { basicUserSelect } from "@/lib/users";
import { joinRequestDecisionSchema } from "@/lib/validations";

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
      allowJoinRequests: true,
      participants: { where: { userId: user.id }, select: { userId: true } },
    },
  });

  if (!event) {
    return notFound("Event");
  }

  if (!event.allowJoinRequests) {
    return forbidden();
  }

  if (event.participants.length > 0) {
    return jsonError("You are already a participant.");
  }

  const request = await prisma.eventJoinRequest.upsert({
    where: {
      eventId_userId: {
        eventId: id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      eventId: id,
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

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = joinRequestDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const pending = await prisma.eventJoinRequest.findUnique({
    where: {
      eventId_userId: {
        eventId: id,
        userId: parsed.data.userId,
      },
    },
  });

  if (!pending) {
    return notFound("Join request");
  }

  if (parsed.data.action === "accept") {
    await prisma.eventParticipant.upsert({
      where: {
        eventId_userId: {
          eventId: id,
          userId: parsed.data.userId,
        },
      },
      update: {},
      create: {
        eventId: id,
        userId: parsed.data.userId,
      },
    });
  }

  await prisma.eventJoinRequest.delete({
    where: {
      eventId_userId: {
        eventId: id,
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

  if (!(await canViewEvent(id, user.id))) {
    return forbidden();
  }

  await prisma.eventJoinRequest.deleteMany({
    where: {
      eventId: id,
      userId: user.id,
    },
  });

  return Response.json({ ok: true });
}
