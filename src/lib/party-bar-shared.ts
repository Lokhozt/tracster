import { PARTY_BAR_SLOT_COUNT } from "@/lib/event-type-helpers";

/** Documents page SectionNav id for the Trac Bar category (not a DB category). */
export const TRAC_BAR_DOCUMENTS_SECTION_ID = "trac-bar";

export type PartyBarSlot = { userId: string; name: string } | null;

export function buildPartyBarSlots(
  participants: { userId: string; name: string }[],
  slotCount = PARTY_BAR_SLOT_COUNT,
): PartyBarSlot[] {
  const slots: PartyBarSlot[] = participants.slice(0, slotCount).map((participant) => ({
    userId: participant.userId,
    name: participant.name,
  }));
  while (slots.length < slotCount) {
    slots.push(null);
  }
  return slots;
}

export function isPartyBarSignupOpen(options: {
  enabled: boolean;
  participantCount: number;
  slotCount?: number;
}): boolean {
  return (
    options.enabled &&
    options.participantCount < (options.slotCount ?? PARTY_BAR_SLOT_COUNT)
  );
}

export function partyBarSlotIdsLimitError(barSlotUserIds: string[]): string | null {
  const unique = [...new Set(barSlotUserIds)];
  if (unique.length > PARTY_BAR_SLOT_COUNT) {
    return `Party events can have at most ${PARTY_BAR_SLOT_COUNT} bar volunteers.`;
  }
  return null;
}
