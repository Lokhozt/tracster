"use client";

import { useEffect, useState } from "react";
import { SchedulingCandidateCalendar } from "@/components/SchedulingCandidateCalendar";
import { Card, Label, Select } from "@/components/ui";
import { parseDayKey } from "@/lib/scheduling/intervals";
import type {
  SchedulePlacement,
  SchedulingAvailabilityBand,
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
  const [availabilityItemId, setAvailabilityItemId] = useState("");
  const [availabilityResult, setAvailabilityResult] = useState<{
    requestKey: string;
    bands: SchedulingAvailabilityBand[];
    error: string | null;
  } | null>(null);
  const choreographerConflicts = placements.filter(
    (placement) => (conflicts[placement.itemId]?.choreographerUnavailable.length ?? 0) > 0,
  );
  const participantConflicts = placements.filter((placement) => {
    const conflict = conflicts[placement.itemId];
    return conflict && (conflict.unavailable.length > 0 || conflict.engaged.length > 0);
  });

  useEffect(() => {
    if (!highlightUserId || days.length === 0) {
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

  const availabilityRequestKey = JSON.stringify({
    selectedItemId: availabilityItemId,
    days,
    placements: placements.map((placement) => ({
      itemId: placement.itemId,
      choreographyId: placement.choreographyId,
      groupId: placement.groupId,
      startsAt: placement.startsAt,
      endsAt: placement.endsAt,
    })),
  });
  const availabilityCurrent = availabilityResult?.requestKey === availabilityRequestKey;
  const availabilityBands = availabilityCurrent ? availabilityResult.bands : [];
  const availabilityError = availabilityCurrent ? availabilityResult.error : null;
  const availabilityLoading = Boolean(availabilityItemId && !availabilityCurrent);

  useEffect(() => {
    if (!availabilityItemId || days.length === 0) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/scheduling/availability-heatmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: availabilityRequestKey,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "AVAILABILITY_HEATMAP_FAILED");
        }
        setAvailabilityResult({
          requestKey: availabilityRequestKey,
          bands: data.bands as SchedulingAvailabilityBand[],
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setAvailabilityResult({
          requestKey: availabilityRequestKey,
          bands: [],
          error: t("choreographyAvailabilityError"),
        });
      });

    return () => controller.abort();
  }, [availabilityItemId, availabilityRequestKey, days.length, t]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t("editSchedule")}</h2>
          <p className="mt-1 text-sm text-stone-600">{t("editScheduleHelp")}</p>
          <p className="mt-1 text-sm text-stone-600">{t("highlightChoreographyAvailabilityHelp")}</p>
        </div>
        {users.length > 0 && (
          <div>
            <Label htmlFor="scheduling-highlight-user">{t("highlightUserUnavailability")}</Label>
            <Select
              id="scheduling-highlight-user"
              className="mt-1 w-full max-w-sm"
              value={highlightUserId}
              onChange={(event) => {
                const userId = event.target.value;
                setHighlightBands([]);
                setHighlightError(null);
                setHighlightUserId(userId);
                if (userId) {
                  setAvailabilityItemId("");
                }
              }}
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
        {availabilityLoading && (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        )}
        {availabilityError && (
          <p className="text-sm text-red-700">{availabilityError}</p>
        )}
        <SchedulingCandidateCalendar
          placements={placements}
          editable
          days={days}
          locations={locations}
          conflicts={conflicts}
          unavailability={highlightUserId ? highlightBands : []}
          locationUnavailability={locationUnavailability}
          availabilityHeatmap={availabilityItemId ? availabilityBands : []}
          selectedItemId={availabilityItemId || undefined}
          highlightUserId={highlightUserId || undefined}
          highlightUserName={users.find((user) => user.id === highlightUserId)?.name}
          onMove={onMove}
          onSelect={(itemId) => {
            setAvailabilityItemId((current) => (current === itemId ? "" : itemId));
            setHighlightBands([]);
            setHighlightError(null);
            setHighlightUserId("");
          }}
        />
        {availabilityItemId && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-700">
            {[
              ["bg-blue-300", t("availabilityAllParticipants")],
              ["bg-green-400", t("availabilityOneParticipant")],
              ["bg-yellow-300", t("availabilityTwoParticipants")],
              ["bg-orange-400", t("availabilityThreeParticipants")],
              ["bg-red-900", t("availabilityAllChoreographers")],
            ].map(([color, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className={`size-3 rounded-sm ${color}`} aria-hidden />
                {label}
              </span>
            ))}
          </div>
        )}
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
