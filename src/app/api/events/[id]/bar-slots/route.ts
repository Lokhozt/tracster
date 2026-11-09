import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { assignUserSchema } from "@/lib/validations";
import { canEditEvent, canViewEvent, ensureEventParticipant } from "@/lib/events";
import { isPartyEventKind, PARTY_BAR_SLOT_COUNT } from "@/lib/event-type-helpers";
import { basicUserSelect, formatUserName } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

async function nextSlotIndex(eventId: string): Promise<number | null> {
  const filled = await prisma.eventPartyBarSlot.findMany({
    where: { eventId },
    select: { slotIndex: true },
  });
  const taken = new Set(filled.map((slot) => slot.slotIndex));
  for (let index = 0; index < PARTY_BAR_SLOT_COUNT; index += 1) {
    if (!taken.has(index)) {
      return index;
    }
  }
  return null;
}

export async function POST(request: NextRequest, context: RouteContext) {
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
      partyBarSlotsEnabled: true,
      type: { select: { kind: true } },
      _count: { select: { partyBarSlots: true } },
    },
  });
  if (!event) {
    return notFound("Event");
  }
  if (!isPartyEventKind(event.type.kind)) {
    return jsonError("This event has no bar slots.");
  }
  if (!event.partyBarSlotsEnabled) {
    return jsonError("Bar slots are disabled for this party.");
  }

  const text = await request.text();
  let targetUserId = user.id;
  if (text) {
    const parsed = assignUserSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }
    if (parsed.data.userId !== user.id) {
      if (!(await canEditEvent(id, user.id))) {
        return forbidden();
      }
      targetUserId = parsed.data.userId;
    }
  }

  const existing = await prisma.eventPartyBarSlot.findUnique({
    where: { eventId_userId: { eventId: id, userId: targetUserId } },
    select: { slotIndex: true },
  });
  if (existing) {
    return jsonError("This user already has a bar slot.");
  }
  if (event._count.partyBarSlots >= PARTY_BAR_SLOT_COUNT) {
    return jsonError("All bar slots are already taken.");
  }

  const slotIndex = await nextSlotIndex(id);
  if (slotIndex === null) {
    return jsonError("All bar slots are already taken.");
  }

  const slot = await prisma.eventPartyBarSlot.create({
    data: { eventId: id, slotIndex, userId: targetUserId },
    include: { user: { select: basicUserSelect } },
  });
  await ensureEventParticipant(id, targetUserId);

  return Response.json(
    {
      slot: {
        slotIndex: slot.slotIndex,
        userId: slot.userId,
        name: formatUserName(slot.user),
      },
    },
    { status: 201 },
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  const text = await request.text();
  let targetUserId = user.id;
  if (text) {
    const parsed = assignUserSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }
    targetUserId = parsed.data.userId;
    if (targetUserId !== user.id && !(await canEditEvent(id, user.id))) {
      return forbidden();
    }
  } else if (!(await canViewEvent(id, user.id))) {
    return forbidden();
  }

  const removed = await prisma.eventPartyBarSlot.deleteMany({
    where: { eventId: id, userId: targetUserId },
  });
  if (removed.count === 0) {
    return jsonError("This user does not hold a bar slot.");
  }

  return Response.json({ ok: true });
}
