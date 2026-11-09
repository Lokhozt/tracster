import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { PARTY_BAR_SLOT_COUNT } from "@/lib/event-type-helpers";
import { basicUserSelect, formatUserName } from "@/lib/users";
import {
  buildPartyBarSlots,
  isPartyBarSignupOpen,
  type PartyBarSlot,
} from "@/lib/party-bar-shared";

export type PartyBarPlanningReminder = {
  id: string;
  displayTitle: string;
  filledCount: number;
  slotCount: number;
};

export {
  TRAC_BAR_DOCUMENTS_SECTION_ID,
  buildPartyBarSlots,
  partyBarSlotIdsLimitError,
  type PartyBarSlot,
} from "@/lib/party-bar-shared";

export type SerializedUpcomingParty = {
  id: string;
  title: string;
  startsAt: string;
  displayTitle: string;
  slots: PartyBarSlot[];
};

export async function listUpcomingPartyBarEvents(): Promise<SerializedUpcomingParty[]> {
  const events = await prisma.event.findMany({
    where: {
      startsAt: { gte: new Date() },
      partyBarSlotsEnabled: true,
      type: { kind: "PARTY" },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      type: { select: { name: true, kind: true } },
      partyBarSlots: {
        orderBy: { slotIndex: "asc" },
        select: {
          userId: true,
          user: { select: basicUserSelect },
        },
      },
    },
  });

  return events.map((event) => {
    const trimmedTitle = event.title.trim();
    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt.toISOString(),
      displayTitle: trimmedTitle || event.type.name,
      slots: buildPartyBarSlots(
        event.partyBarSlots.map((slot) => ({
          userId: slot.userId,
          name: formatUserName(slot.user),
        })),
      ),
    };
  });
}

export async function listPartyBarPlanningReminders(
  now = new Date(),
): Promise<PartyBarPlanningReminder[]> {
  const rangeEnd = addDays(now, 14);

  const events = await prisma.event.findMany({
    where: {
      partyBarSlotsEnabled: true,
      type: { kind: "PARTY" },
      startsAt: { gte: now, lte: rangeEnd },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
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
      filledCount: event._count.partyBarSlots,
      slotCount: PARTY_BAR_SLOT_COUNT,
    }));
}
