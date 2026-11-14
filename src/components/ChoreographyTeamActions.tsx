"use client";

import { useSearchParams } from "next/navigation";
import { FAB_MENU_ITEM_CLASS, FloatingActionButton } from "@/components/FloatingActionButton";
import { FormSheet } from "@/components/Sheet";
import { openCreateSheet, useCreateSheet } from "@/lib/create-sheet";

type TeamAction = {
  /** Also its `?create=` id, so other menus (the overview "+") can open it. */
  id: string;
  label: string;
  form: React.ReactNode;
};

/**
 * Phones/tablets: the team management forms (add choreographer, transfer ownership, add
 * participant) open from the floating "+" menu, each in a form sheet (`?create=<id>`), instead
 * of filling the Team tab. Only shown while the Team tab is active.
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
  const openActionId = searchParams.get("create");
  const sheet = useCreateSheet(openActionId ?? "");

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
            onClick={() => openCreateSheet(action.id)}
          >
            {action.label}
          </button>
        ))}
      />
      {actions.map((action) => (
        <FormSheet
          key={action.id}
          open={openActionId === action.id}
          onClose={sheet.close}
          title={action.label}
        >
          {action.form}
        </FormSheet>
      ))}
    </>
  );
}
