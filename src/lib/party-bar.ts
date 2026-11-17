import { addDays, addHours } from "date-fns";
import { prisma } from "@/lib/db";
import { canEditEvent } from "@/lib/events";
import { PARTY_BAR_SLOT_COUNT } from "@/lib/event-type-helpers";
import { displayLocation, listedLocationInclude } from "@/lib/locations";
import { buildPartyBarSlots, isPartyBarSignupOpen, type PartyBarSlot } from "@/lib/party-bar-shared";
import { visibleEventWhere } from "@/lib/participation";
import { canManageAllEvents } from "@/lib/roles";
import { basicUserSelect, formatUserName } from "@/lib/users";

export type PartyBarPlanningReminder = {
  id: string;
  displayTitle: string;
  startsAt: string;
  filledCount: number;
  slotCount: number;
};

export {
  buildPartyBarSlots,
  partyBarSlotIdsLimitError,
  type PartyBarSlot,
} from "@/lib/party-bar-shared";

/**
 * Parties in the next two weeks that still need bar volunteers. With `userId`, parties where
 * that user already holds a slot are left out (no point reminding them).
 */
export async function listPartyBarPlanningReminders(
  now = new Date(),
  userId?: string,
): Promise<PartyBarPlanningReminder[]> {
  const rangeEnd = addDays(now, 14);

  const events = await prisma.event.findMany({
    where: {
      partyBarSlotsEnabled: true,
      type: { kind: "PARTY" },
      startsAt: { gte: now, lte: rangeEnd },
      ...(userId ? { partyBarSlots: { none: { userId } } } : {}),
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      type: { select: { name: true } },
      _count: { select: { partyBarSlots: true } },
    },
  });

  return events
    .filter((event) =>
      isPartyBarSignupOpen({
        enabled: true,
        participantCount: event._count.partyBarSlots,
      }),
    )
    .map((event) => ({
      id: event.id,
      displayTitle: event.title.trim() || event.type.name,
      startsAt: event.startsAt.toISOString(),
      filledCount: event._count.partyBarSlots,
      slotCount: PARTY_BAR_SLOT_COUNT,
    }));
}

export type BarParty = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  slots: PartyBarSlot[];
  filledCount: number;
  slotCount: number;
  /** The viewer said "Je viens" (holding a slot also counts). */
  isAttending: boolean;
  /** The viewer holds one of the bar slots. */
  holdsSlot: boolean;
  /** Organisers can remove a volunteer. */
  canManage: boolean;
};

/**
 * Parties with bar slots that are not over yet, as the viewer may see them (same visibility as
 * the planning), with who holds each slot. The Bar tab's data.
 */
export async function listUpcomingBarParties(userId: string, now = new Date()): Promise<BarParty[]> {
  const [globalAccess, viewer] = await Promise.all([
    canManageAllEvents(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { isCompetitor: true } }),
  ]);
  const visibility = visibleEventWhere(userId, {
    globalAccess,
    isCompetitor: Boolean(viewer?.isCompetitor),
  });

  const events = await prisma.event.findMany({
    where: {
      AND: [
        visibility ?? {},
        { type: { kind: "PARTY" }, partyBarSlotsEnabled: true },
        // Still running or to come (a party without an end counts until six hours after it starts).
        {
          OR: [
            { endsAt: { gt: now } },
            { endsAt: null, startsAt: { gt: addHours(now, -6) } },
          ],
        },
      ],
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true,
      ...listedLocationInclude,
      type: { select: { name: true } },
      partyBarSlots: {
        orderBy: { slotIndex: "asc" },
        select: { userId: true, user: { select: basicUserSelect } },
      },
      participants: { where: { userId }, select: { userId: true } },
    },
  });

  return Promise.all(
    events.map(async (event) => {
      const slots = buildPartyBarSlots(
        event.partyBarSlots.map((slot) => ({ userId: slot.userId, name: formatUserName(slot.user) })),
      );
      const holdsSlot = event.partyBarSlots.some((slot) => slot.userId === userId);
      return {
        id: event.id,
        title: event.title.trim() || event.type.name,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
        location: displayLocation(event),
        slots,
        filledCount: event.partyBarSlots.length,
        slotCount: PARTY_BAR_SLOT_COUNT,
        isAttending: holdsSlot || event.participants.length > 0,
        holdsSlot,
        canManage: await canEditEvent(event.id, userId),
      };
    }),
  );
}
