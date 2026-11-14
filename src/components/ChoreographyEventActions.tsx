"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { requestAddForm } from "@/components/ChoreographyTabs";
import { FAB_MENU_ITEM_CLASS, FloatingActionButton } from "@/components/FloatingActionButton";

/**
 * Phones/tablets: the Events section's actions in the floating "+" menu (schedule a rehearsal,
 * add a representation / demonstration, rehearsal statistics for admins and the owner). Picking an "add" entry opens that
 * section's form via `?add=` (see useAddFormRequest). Only shown while the Events section is open.
 */
export function ChoreographyEventActions({
  sectionId,
  choreographyId,
  canEdit,
  canAddDemonstration,
  canViewStatistics,
}: {
  /** The Events section's id in `?section=`. */
  sectionId: string;
  choreographyId: string;
  canEdit: boolean;
  /** Demonstrations need the matching event type to exist. */
  canAddDemonstration: boolean;
  /** Rehearsal statistics: admins and the choreography's owner. */
  canViewStatistics: boolean;
}) {
  const t = useTranslations("Components");
  const searchParams = useSearchParams();
  if (searchParams.get("section") !== sectionId) {
    return null;
  }

  const addItems = canEdit
    ? [
        { kind: "rehearsal", label: t("scheduleRehearsal") },
        { kind: "representation", label: t("addRepresentation") },
        ...(canAddDemonstration ? [{ kind: "demonstration", label: t("addDemonstration") }] : []),
      ]
    : [];

  return (
    <FloatingActionButton
      actions={
        canViewStatistics
          ? [
              {
                href: `/choreographies/${choreographyId}/rehearsals/statistics`,
                label: t("rehearsalStatistics"),
              },
            ]
          : []
      }
      extraItems={addItems.map((item) => (
        <button
          key={item.kind}
          type="button"
          data-fab-close=""
          className={FAB_MENU_ITEM_CLASS}
          onClick={() => requestAddForm(item.kind)}
        >
          {item.label}
        </button>
      ))}
    />
  );
}
