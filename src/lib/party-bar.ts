import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { PARTY_BAR_SLOT_COUNT } from "@/lib/event-type-helpers";
import { isPartyBarSignupOpen } from "@/lib/party-bar-shared";

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
