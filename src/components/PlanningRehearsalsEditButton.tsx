"use client";

import { endOfWeek, format, startOfWeek } from "date-fns";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { SchedulingImageExportButton } from "@/components/PlanningImageExport";
import { SchedulingPlanEditor } from "@/components/SchedulingPlanEditor";
import { Button, Input, Label } from "@/components/ui";
import { parseDayKey } from "@/lib/scheduling/intervals";
import type {
  SchedulePlacement,
  SchedulingPlacementConflicts,
} from "@/lib/scheduling/types";
import { cn } from "@/lib/utils";

function EditPlanningIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function PlanningRehearsalsEditButton({
  locations,
  users,
}: {
  locations: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [currentWeek] = useState(() => {
    const now = new Date();
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  });
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"range" | "edit">("range");
  const [startDate, setStartDate] = useState(format(currentWeek.start, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(currentWeek.end, "yyyy-MM-dd"));
  const [days, setDays] = useState<string[]>([]);
  const [placements, setPlacements] = useState<SchedulePlacement[]>([]);
  const [skippedMissingLocation, setSkippedMissingLocation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placementConflicts, setPlacementConflicts] =
    useState<SchedulingPlacementConflicts>({});
  const [unavailableAllPeriod, setUnavailableAllPeriod] = useState<string[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const conflictRequestId = useRef(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function resetDialog() {
    setPhase("range");
    setPlacements([]);
    setDays([]);
    setSkippedMissingLocation(0);
    setError(null);
    setPlacementConflicts({});
    setUnavailableAllPeriod([]);
    setConflictError(null);
  }

  async function checkPlacementConflicts(
    nextPlacements: SchedulePlacement[],
    nextDays: string[],
  ) {
    const requestId = conflictRequestId.current + 1;
    conflictRequestId.current = requestId;
    setCheckingConflicts(true);
    setConflictError(null);

    try {
      const response = await fetch("/api/scheduling/conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: nextDays,
          excludeRehearsalIds: nextPlacements.map((placement) => placement.itemId),
          placements: nextPlacements.map((placement) => ({
            itemId: placement.itemId,
            choreographyId: placement.choreographyId,
            groupId: placement.groupId,
            startsAt: placement.startsAt,
            endsAt: placement.endsAt,
          })),
        }),
      });
      const data = await response.json();
      if (requestId !== conflictRequestId.current) {
        return;
      }
      if (!response.ok) {
        setConflictError(data.error ?? t("scheduleConflictCheckError"));
        return;
      }
      setPlacementConflicts(data.conflicts as SchedulingPlacementConflicts);
      setUnavailableAllPeriod(
        Array.isArray(data.unavailableAllPeriod) ? data.unavailableAllPeriod : [],
      );
    } catch {
      if (requestId === conflictRequestId.current) {
        setConflictError(t("scheduleConflictCheckError"));
      }
    } finally {
      if (requestId === conflictRequestId.current) {
        setCheckingConflicts(false);
      }
    }
  }

  async function loadPeriod() {
    const start = parseDayKey(startDate);
    const end = parseDayKey(endDate);
    if (end < start) {
      setError(t("exportDateRangeInvalid"));
      return;
    }

    setLoading(true);
    setError(null);
    const response = await fetch("/api/scheduling/planning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("planningEditLoadError"));
      return;
    }

    const nextPlacements = data.placements as SchedulePlacement[];
    const nextDays = data.days as string[];
    setSkippedMissingLocation(data.skippedMissingLocation ?? 0);

    if (nextPlacements.length === 0) {
      setError(t("planningEditNoRehearsals"));
      return;
    }

    setPlacements(nextPlacements);
    setDays(nextDays);
    setPhase("edit");
    void checkPlacementConflicts(nextPlacements, nextDays);
  }

  function moveEditedPlacement(
    itemId: string,
    locationId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const location = locations.find((entry) => entry.id === locationId);
    const nextPlacements = placements.map((placement) =>
      placement.itemId === itemId
        ? {
            ...placement,
            locationId,
            locationName: location?.name ?? placement.locationName,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          }
        : placement,
    );
    setPlacements(nextPlacements);
    void checkPlacementConflicts(nextPlacements, days);
  }

  async function applyChanges() {
    setApplying(true);
    setError(null);

    const response = await fetch("/api/scheduling/planning/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        placements: placements.map((placement) => ({
          eventId: placement.itemId,
          choreographyId: placement.choreographyId,
          groupId: placement.groupId,
          locationId: placement.locationId,
          startsAt: placement.startsAt,
          endsAt: placement.endsAt,
        })),
      }),
    });
    const data = await response.json();
    setApplying(false);

    if (!response.ok) {
      setError(data.error ?? t("planningEditApplyError"));
      return;
    }

    setOpen(false);
    resetDialog();
    router.refresh();
  }

  const editLabel = t("editPlanningRehearsals");
  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetDialog();
          setStartDate(format(currentWeek.start, "yyyy-MM-dd"));
          setEndDate(format(currentWeek.end, "yyyy-MM-dd"));
          setOpen(true);
        }}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 disabled:opacity-50"
        aria-label={editLabel}
        title={editLabel}
      >
        <EditPlanningIcon />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planning-edit-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            className={cn(
              "max-h-[92vh] w-full overflow-y-auto rounded-xl bg-white p-5 shadow-xl",
              phase === "edit" ? "max-w-6xl" : "max-w-md",
            )}
          >
            <h2 id="planning-edit-title" className="text-lg font-semibold">
              {editLabel}
            </h2>
            {phase === "range" ? (
              <>
                <p className="mt-1 text-sm text-stone-600">{t("editPlanningRehearsalsHelp")}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="planning-edit-start">{t("exportStartDate")}</Label>
                    <Input
                      id="planning-edit-start"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="planning-edit-end">{t("exportEndDate")}</Label>
                    <Input
                      id="planning-edit-end"
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-stone-600">
                  {t("editPlanningRehearsalsPeriod", {
                    start: startDate,
                    end: endDate,
                  })}
                </p>
                {skippedMissingLocation > 0 && (
                  <p className="mt-2 text-sm text-amber-800">
                    {t("planningEditSkippedMissingLocation", {
                      count: skippedMissingLocation,
                    })}
                  </p>
                )}
                <div className="mt-4">
                  <SchedulingPlanEditor
                    placements={placements}
                    days={days}
                    locations={locations}
                    conflicts={placementConflicts}
                    unavailableAllPeriod={unavailableAllPeriod}
                    users={users}
                    checkingConflicts={checkingConflicts}
                    conflictError={conflictError}
                    onMove={moveEditedPlacement}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void applyChanges()}
                    disabled={applying || placements.length === 0}
                  >
                    {applying ? t("applyingPlanningChanges") : t("applyPlanningChanges")}
                  </Button>
                  <SchedulingImageExportButton
                    placements={placements}
                    days={days}
                    locations={locations}
                  />
                </div>
              </>
            )}
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              {phase === "edit" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setPhase("range");
                    setError(null);
                  }}
                  disabled={applying}
                >
                  {t("back")}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={loading || applying}
              >
                {t("cancel")}
              </Button>
              {phase === "range" && (
                <Button type="button" onClick={() => void loadPeriod()} disabled={loading}>
                  {loading ? t("loadingPlanningRehearsals") : t("continue")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
