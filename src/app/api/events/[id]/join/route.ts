import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canViewEvent } from "@/lib/events";
import { loadSeriesOrigin, loadUpcomingSeriesTargets } from "@/lib/event-series";
import { basicUserSelect } from "@/lib/users";
import { applyToUpcomingBodySchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

async function readApplyToUpcoming(request: NextRequest) {
  const text = await request.text();
  if (!text) {
    return false;
  }

  try {
    const parsed = applyToUpcomingBodySchema.safeParse(JSON.parse(text));
    return Boolean(parsed.success && parsed.data.applyToUpcoming);
  } catch {
    return false;
  }
}

async function participationTargets(eventId: string, applyToUpcoming: boolean) {
  const origin = await loadSeriesOrigin(eventId);
  if (!origin) {
    return null;
  }
  return loadUpcomingSeriesTargets(origin, applyToUpcoming);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const applyToUpcoming = await readApplyToUpcoming(request);

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

  if (event.participants.length > 0 && !applyToUpcoming) {
    return jsonError("You are already a participant.");
  }

  const targets = await participationTargets(id, applyToUpcoming);
  if (!targets) {
    return notFound("Event");
  }

  await prisma.eventParticipant.createMany({
    data: targets.map((target) => ({
      eventId: target.id,
      userId: user.id,
    })),
    skipDuplicates: true,
  });

  await prisma.eventJoinRequest.deleteMany({
    where: { eventId: { in: targets.map((target) => target.id) }, userId: user.id },
  });

  const participant = await prisma.eventParticipant.findUnique({
    where: {
      eventId_userId: {
        eventId: id,
        userId: user.id,
      },
    },
    include: { user: { select: basicUserSelect } },
  });

  return Response.json({ participant }, { status: 201 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const applyToUpcoming = await readApplyToUpcoming(request);

  if (!(await canViewEvent(id, user.id))) {
    return forbidden();
  }

  const targets = await participationTargets(id, applyToUpcoming);
  if (!targets) {
    return notFound("Event");
  }

  const removed = await prisma.eventParticipant.deleteMany({
    where: {
      eventId: { in: targets.map((target) => target.id) },
      userId: user.id,
    },
  });

  if (removed.count === 0) {
    return jsonError("You are not a participant of this event.");
  }

  return Response.json({ ok: true });
}
