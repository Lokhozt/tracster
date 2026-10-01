import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canEditChoreography } from "@/lib/permissions";
import { canManageAllEvents } from "@/lib/roles";
import { getLinkableChoreographies } from "@/lib/representations";
import {
  canEditEvent,
  participantIdsForChoreographyLinks,
  validateChoreographyLinkGroups,
} from "@/lib/events";
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

  return Response.json({
    choreographies: choreographies.map((choreography) => ({
      id: choreography.id,
      title: choreography.title,
      groups:
        event.type.kind === "DEMONSTRATION"
          ? choreography.groups.map((group) => ({
              id: group.id,
              name: group.name,
              memberCount: group._count.members,
            }))
          : [],
    })),
  });
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

  if (
    !(await canManageAllEvents(user.id)) &&
    !(await canEditChoreography(parsed.data.choreographyId, user.id))
  ) {
    return forbidden();
  }

  const linkInput = {
    choreographyId: parsed.data.choreographyId,
    groupId: parsed.data.groupId ?? null,
  };
  const linkGroupError = await validateChoreographyLinkGroups(event.type.kind, [linkInput]);
  if (linkGroupError) {
    return jsonError(linkGroupError);
  }

  const participantIds =
    event.type.kind === "DEMONSTRATION"
      ? await participantIdsForChoreographyLinks([linkInput])
      : [];

  const link = await prisma.$transaction(async (tx) => {
    const saved = await tx.eventChoreography.upsert({
      where: {
        eventId_choreographyId: {
          choreographyId: parsed.data.choreographyId,
          eventId: id,
        },
      },
      update: event.type.kind === "DEMONSTRATION" ? { groupId: linkInput.groupId } : {},
      create: {
        choreographyId: parsed.data.choreographyId,
        eventId: id,
        groupId: linkInput.groupId,
      },
      include: {
        choreography: { select: { id: true, title: true } },
        group: { select: { id: true, name: true } },
      },
    });

    if (participantIds.length > 0) {
      await tx.eventParticipant.createMany({
        data: participantIds.map((userId) => ({ eventId: id, userId })),
        skipDuplicates: true,
      });
    }

    return saved;
  });

  return Response.json({
    choreography: link.choreography,
    group: link.group,
  }, { status: 201 });
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
