"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FAB_MENU_ITEM_CLASS, FloatingActionButton } from "@/components/FloatingActionButton";
import { openCreateSheet } from "@/lib/create-sheet";

export type OverviewAddAction =
  /** A create sheet of an in-page section (`?section=<section>&create=<kind>`). */
  | { kind: string; section: string; label: string }
  /** A create route (opens as a sheet over the page). */
  | { href: string; label: string };

/**
 * Phones/tablets: the "+" of a choreography's overview gathers the "add" actions of all its
 * sections (rehearsal, representation, resource, participant, group…). Picking one opens that
 * section with its form sheet in a single history step, so "back" returns to the overview.
 */
export function ChoreographyOverviewActions({ actions }: { actions: OverviewAddAction[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  if ((section !== null && section !== "overview") || actions.length === 0) {
    return null;
  }

  return (
    // All as buttons so the menu keeps the order of the sections (links would come first).
    <FloatingActionButton
      actions={[]}
      extraItems={actions.map((action) => (
        <button
          key={"href" in action ? action.href : `${action.section}-${action.kind}`}
          type="button"
          data-fab-close=""
          className={FAB_MENU_ITEM_CLASS}
          onClick={() =>
            "href" in action
              ? router.push(action.href)
              : openCreateSheet(action.kind, { section: action.section })
          }
        >
          {action.label}
        </button>
      ))}
    />
  );
}
