import type { SchedulePlacement, SchedulingPlacementConflicts } from "@/lib/scheduling/types";

export function placementDurationMs(placement: SchedulePlacement): number {
  return new Date(placement.endsAt).getTime() - new Date(placement.startsAt).getTime();
}

/** Exchange time and location between two placements; null when durations differ. */
export function swappedPlacements(
  placements: SchedulePlacement[],
  firstItemId: string,
  secondItemId: string,
): SchedulePlacement[] | null {
  const first = placements.find((placement) => placement.itemId === firstItemId);
  const second = placements.find((placement) => placement.itemId === secondItemId);
  if (!first || !second || firstItemId === secondItemId) {
    return null;
  }
  if (placementDurationMs(first) !== placementDurationMs(second)) {
    return null;
  }

  return placements.map((placement) => {
    if (placement.itemId === firstItemId) {
      return {
        ...placement,
        locationId: second.locationId,
        locationName: second.locationName,
        startsAt: second.startsAt,
        endsAt: second.endsAt,
      };
    }
    if (placement.itemId === secondItemId) {
      return {
        ...placement,
        locationId: first.locationId,
        locationName: first.locationName,
        startsAt: first.startsAt,
        endsAt: first.endsAt,
      };
    }
    return placement;
  });
}

type SwapPreviewTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function swapPlacementLabel(placement: SchedulePlacement): string {
  return placement.groupName
    ? `${placement.choreographyTitle} · ${placement.groupName}`
    : placement.choreographyTitle;
}

export type SwapPreviewSide = {
  title: string;
  constraints: string[];
};

function conflictDetailLines(
  conflict: SchedulingPlacementConflicts[string] | undefined,
  t: SwapPreviewTranslator,
): string[] {
  if (!conflict) {
    return [];
  }
  const lines: string[] = [];
  if (conflict.choreographerUnavailable.length > 0) {
    lines.push(
      t("scheduleChoreographerUnavailable", {
        names: conflict.choreographerUnavailable.join(", "),
      }),
    );
  }
  if (conflict.unavailable.length > 0) {
    lines.push(
      t("scheduleUnavailableConflict", { names: conflict.unavailable.join(", ") }),
    );
  }
  if (conflict.engaged.length > 0) {
    lines.push(t("scheduleEngagedConflict", { names: conflict.engaged.join(", ") }));
  }
  return lines;
}

export function swapConflictPreviewSides(
  conflicts: SchedulingPlacementConflicts,
  selected: SchedulePlacement,
  hovered: SchedulePlacement,
  t: SwapPreviewTranslator,
): { selected: SwapPreviewSide; hovered: SwapPreviewSide } {
  return {
    selected: {
      title: swapPlacementLabel(selected),
      constraints: conflictDetailLines(conflicts[selected.itemId], t),
    },
    hovered: {
      title: swapPlacementLabel(hovered),
      constraints: conflictDetailLines(conflicts[hovered.itemId], t),
    },
  };
}
