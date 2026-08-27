import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canEditChoreography } from "@/lib/permissions";
import { getLinkableChoreographies } from "@/lib/representations";
import { canEditEvent } from "@/lib/events";
import { eventKindAllowsChoreographyLinks } from "@/lib/event-type-helpers";
import { linkChoreographySchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

async function getLinkableEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    select: { id: true, type: { select: { kind: true } } },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  const event = await getLinkableEvent(id);
  if (!event || !eventKindAllowsChoreographyLinks(event.type.kind)) {
    return jsonError("This event type cannot be linked to choreographies.");
  }

  const choreographies = await getLinkableChoreographies(user.id, id);

  return Response.json({ choreographies });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  const event = await getLinkableEvent(id);
  if (!event || !eventKindAllowsChoreographyLinks(event.type.kind)) {
    return jsonError("This event type cannot be linked to choreographies.");
  }

  const body = await request.json();
  const parsed = linkChoreographySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const choreography = await prisma.choreography.findUnique({
    where: { id: parsed.data.choreographyId },
    select: { id: true },
  });
  if (!choreography) {
    return notFound("Choreography");
  }

  if (!(await canEditChoreography(parsed.data.choreographyId, user.id))) {
    return forbidden();
  }

  const link = await prisma.eventChoreography.upsert({
    where: {
      eventId_choreographyId: {
        choreographyId: parsed.data.choreographyId,
        eventId: id,
      },
    },
    update: {},
    create: {
      choreographyId: parsed.data.choreographyId,
      eventId: id,
    },
    include: {
      choreography: { select: { id: true, title: true } },
    },
  });

  return Response.json({ choreography: link.choreography }, { status: 201 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  const event = await getLinkableEvent(id);
  if (!event || !eventKindAllowsChoreographyLinks(event.type.kind)) {
    return jsonError("This event type cannot be linked to choreographies.");
  }

  const body = await request.json();
  const parsed = linkChoreographySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await prisma.eventChoreography.deleteMany({
    where: {
      eventId: id,
      choreographyId: parsed.data.choreographyId,
    },
  });

  return Response.json({ ok: true });
}
