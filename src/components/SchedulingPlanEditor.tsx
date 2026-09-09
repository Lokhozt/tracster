"use client";

import { SchedulingCandidateCalendar } from "@/components/SchedulingCandidateCalendar";
import { Card } from "@/components/ui";
import type {
  SchedulePlacement,
  SchedulingPlacementConflicts,
} from "@/lib/scheduling/types";
import { useTranslations } from "next-intl";

function placementLabel(placement: SchedulePlacement) {
  return placement.groupName
    ? `${placement.choreographyTitle} · ${placement.groupName}`
    : placement.choreographyTitle;
}

export function SchedulingPlanEditor({
  placements,
  days,
  locations,
  conflicts,
  checkingConflicts,
  conflictError,
  onMove,
}: {
  placements: SchedulePlacement[];
  days: string[];
  locations: Array<{ id: string; name: string }>;
  conflicts: SchedulingPlacementConflicts;
  checkingConflicts: boolean;
  conflictError: string | null;
  onMove: (itemId: string, locationId: string, startsAt: Date, endsAt: Date) => void;
}) {
  const t = useTranslations("Components");
  const conflicted = placements.filter((placement) => {
    const conflict = conflicts[placement.itemId];
    return conflict && (conflict.unavailable.length > 0 || conflict.engaged.length > 0);
  });

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t("editSchedule")}</h2>
          <p className="mt-1 text-sm text-stone-600">{t("editScheduleHelp")}</p>
        </div>
        <SchedulingCandidateCalendar
          placements={placements}
          editable
          days={days}
          locations={locations}
          conflicts={conflicts}
          onMove={onMove}
        />
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("scheduleConflicts")}</h2>
          {checkingConflicts && (
            <span className="text-sm text-stone-500">{t("checkingConflicts")}</span>
          )}
        </div>
        {conflictError ? (
          <p className="mt-3 text-sm text-red-700">{conflictError}</p>
        ) : conflicted.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            {checkingConflicts ? t("checkingConflicts") : t("noScheduleConflicts")}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {conflicted.map((placement) => {
              const conflict = conflicts[placement.itemId];
              return (
                <li
                  key={placement.itemId}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-red-900">{placementLabel(placement)}</p>
                  {conflict.unavailable.length > 0 && (
                    <p className="mt-1 text-red-800">
                      {t("scheduleUnavailableConflict", {
                        names: conflict.unavailable.join(", "),
                      })}
                    </p>
                  )}
                  {conflict.engaged.length > 0 && (
                    <p className="mt-1 text-red-800">
                      {t("scheduleEngagedConflict", {
                        names: conflict.engaged.join(", "),
                      })}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
