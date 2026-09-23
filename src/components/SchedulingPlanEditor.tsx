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
  unavailableAllPeriod,
  checkingConflicts,
  conflictError,
  onMove,
}: {
  placements: SchedulePlacement[];
  days: string[];
  locations: Array<{ id: string; name: string }>;
  conflicts: SchedulingPlacementConflicts;
  unavailableAllPeriod: string[];
  checkingConflicts: boolean;
  conflictError: string | null;
  onMove: (itemId: string, locationId: string, startsAt: Date, endsAt: Date) => void;
}) {
  const t = useTranslations("Components");
  const choreographerConflicts = placements.filter(
    (placement) => (conflicts[placement.itemId]?.choreographerUnavailable.length ?? 0) > 0,
  );
  const participantConflicts = placements.filter((placement) => {
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
        <h2 className="text-lg font-semibold">{t("choreographersNotAvailable")}</h2>
        {conflictError ? (
          <p className="mt-3 text-sm text-red-700">{conflictError}</p>
        ) : choreographerConflicts.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            {checkingConflicts ? t("checkingConflicts") : t("noneCandidate")}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {choreographerConflicts.map((placement) => {
              const names = conflicts[placement.itemId].choreographerUnavailable.join(", ");
              return (
                <li
                  key={placement.itemId}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-red-900">{placementLabel(placement)}</p>
                  <p className="mt-1 text-red-800">
                    {t("scheduleChoreographerUnavailable", { names })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">{t("participantsUnavailableAllPeriod")}</h2>
        {conflictError ? (
          <p className="mt-3 text-sm text-red-700">{conflictError}</p>
        ) : unavailableAllPeriod.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            {checkingConflicts ? t("checkingConflicts") : t("noneCandidate")}
          </p>
        ) : (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-700">
            {unavailableAllPeriod.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
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
        ) : participantConflicts.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            {checkingConflicts ? t("checkingConflicts") : t("noScheduleConflicts")}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {participantConflicts.map((placement) => {
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
