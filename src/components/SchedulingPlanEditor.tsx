"use client";

import { useEffect, useState } from "react";
import { SchedulingCandidateCalendar } from "@/components/SchedulingCandidateCalendar";
import { Card, Label, Select } from "@/components/ui";
import { parseDayKey } from "@/lib/scheduling/intervals";
import type {
  SchedulePlacement,
  SchedulingPlacementConflicts,
} from "@/lib/scheduling/types";
import type { SerializedUnavailability } from "@/lib/unavailability";
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
  locationUnavailability = [],
  conflicts,
  unavailableAllPeriod,
  users,
  checkingConflicts,
  conflictError,
  onMove,
}: {
  placements: SchedulePlacement[];
  days: string[];
  locations: Array<{ id: string; name: string }>;
  locationUnavailability?: Array<{
    locationId: string;
    day: string;
    startsAt: string;
    endsAt: string;
  }>;
  conflicts: SchedulingPlacementConflicts;
  unavailableAllPeriod: string[];
  users: Array<{ id: string; name: string }>;
  checkingConflicts: boolean;
  conflictError: string | null;
  onMove: (itemId: string, locationId: string, startsAt: Date, endsAt: Date) => void;
}) {
  const t = useTranslations("Components");
  const [highlightUserId, setHighlightUserId] = useState("");
  const [highlightBands, setHighlightBands] = useState<SerializedUnavailability[]>([]);
  const [highlightError, setHighlightError] = useState<string | null>(null);
  const choreographerConflicts = placements.filter(
    (placement) => (conflicts[placement.itemId]?.choreographerUnavailable.length ?? 0) > 0,
  );
  const participantConflicts = placements.filter((placement) => {
    const conflict = conflicts[placement.itemId];
    return conflict && (conflict.unavailable.length > 0 || conflict.engaged.length > 0);
  });

  useEffect(() => {
    if (!highlightUserId || days.length === 0) {
      setHighlightBands([]);
      setHighlightError(null);
      return;
    }

    const sortedDays = [...days].sort();
    const from = parseDayKey(sortedDays[0]);
    const to = new Date(parseDayKey(sortedDays[sortedDays.length - 1]).getTime() + 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const controller = new AbortController();
    setHighlightBands([]);
    setHighlightError(null);

    fetch(`/api/users/${highlightUserId}/unavailability?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "UNAVAILABILITY_LOAD_FAILED");
        }
        setHighlightBands(data.timeframes as SerializedUnavailability[]);
        setHighlightError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setHighlightBands([]);
        setHighlightError(t("highlightUserError"));
      });

    return () => controller.abort();
  }, [days, highlightUserId, t]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t("editSchedule")}</h2>
          <p className="mt-1 text-sm text-stone-600">{t("editScheduleHelp")}</p>
        </div>
        {users.length > 0 && (
          <div>
            <Label htmlFor="scheduling-highlight-user">{t("highlightUserUnavailability")}</Label>
            <Select
              id="scheduling-highlight-user"
              className="mt-1 w-full max-w-sm"
              value={highlightUserId}
              onChange={(event) => setHighlightUserId(event.target.value)}
            >
              <option value="">{t("highlightUserNone")}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-stone-500">{t("highlightUserHelp")}</p>
            {highlightError && <p className="mt-1 text-sm text-red-700">{highlightError}</p>}
          </div>
        )}
        <SchedulingCandidateCalendar
          placements={placements}
          editable
          days={days}
          locations={locations}
          conflicts={conflicts}
          unavailability={highlightUserId ? highlightBands : []}
          locationUnavailability={locationUnavailability}
          highlightUserId={highlightUserId || undefined}
          highlightUserName={users.find((user) => user.id === highlightUserId)?.name}
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
