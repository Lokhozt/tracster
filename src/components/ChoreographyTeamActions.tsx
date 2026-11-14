"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FilterSheet } from "@/components/FilterSheet";
import { FAB_MENU_ITEM_CLASS, FloatingActionButton } from "@/components/FloatingActionButton";

type TeamAction = {
  id: string;
  label: string;
  form: React.ReactNode;
};

/**
 * Phones/tablets: the team management forms (add choreographer, transfer ownership, add
 * participant) open from the floating "+" menu, each in a bottom sheet, instead of filling the
 * Team tab. Only shown while the Team tab is active.
 */
export function ChoreographyTeamActions({
  sectionId,
  actions,
}: {
  /** The Team tab's id in `?section=`. */
  sectionId: string;
  actions: TeamAction[];
}) {
  const searchParams = useSearchParams();
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  if (searchParams.get("section") !== sectionId || actions.length === 0) {
    return null;
  }

  return (
    <>
      <FloatingActionButton
        actions={[]}
        extraItems={actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-fab-close=""
            className={FAB_MENU_ITEM_CLASS}
            onClick={() => setOpenActionId(action.id)}
          >
            {action.label}
          </button>
        ))}
      />
      {actions.map((action) => (
        <FilterSheet
          key={action.id}
          open={openActionId === action.id}
          onClose={() => setOpenActionId(null)}
          title={action.label}
        >
          {action.form}
        </FilterSheet>
      ))}
    </>
  );
}
