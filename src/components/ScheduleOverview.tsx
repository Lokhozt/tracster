"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { EventTypeFilter } from "@/components/EventTypeFilter";
import { FollowAssociationCalendarLink } from "@/components/FollowAssociationCalendarLink";
import { PlanningImageExportButton } from "@/components/PlanningImageExport";
import { PlanningRehearsalsEditButton } from "@/components/PlanningRehearsalsEditButton";
import { RehearsalCalendar } from "@/components/RehearsalCalendar";
import { PartyBarPlanningReminders } from "@/components/PartyBarPlanningReminders";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { Card } from "@/components/ui";
import type { PartyBarPlanningReminder } from "@/lib/party-bar";
import {
  persistHiddenEventTypeIds,
  persistHideNonParticipating,
  persistPlanningFiltersCollapsed,
} from "@/lib/event-category-filter";
import { cn } from "@/lib/utils";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import { isBirthdayScheduleEvent } from "@/lib/schedule-birthdays";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";

export function ScheduleOverview({
  events,
  upcoming,
  eventTypes,
  initialHiddenTypeIds,
  initialHideNonParticipating,
  initialPlanningFiltersCollapsed = false,
  associationCalendarUrl,
  startOfDayHour,
  canEditPlanning,
  planningLocations,
  planningUsers,
  partyBarReminders = [],
}: {
  events: SerializedScheduleEvent[];
  upcoming: SerializedScheduleEvent[];
  eventTypes: SerializedEventType[];
  initialHiddenTypeIds: string[];
  initialHideNonParticipating: boolean;
  initialPlanningFiltersCollapsed?: boolean;
  associationCalendarUrl?: string | null;
  startOfDayHour: number;
  canEditPlanning?: boolean;
  planningLocations?: Array<{ id: string; name: string }>;
  planningUsers?: Array<{ id: string; name: string }>;
  partyBarReminders?: PartyBarPlanningReminder[];
}) {
  const t = useTranslations("Components");
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const [hiddenTypeIds, setHiddenTypeIds] = useState(initialHiddenTypeIds);
  const [hideNonParticipating, setHideNonParticipating] = useState(
    initialHideNonParticipating,
  );
  const [filtersExpanded, setFiltersExpanded] = useState(!initialPlanningFiltersCollapsed);

  const preserveScrollAnchor = useCallback((update: () => void) => {
    const topBefore = filterAnchorRef.current?.getBoundingClientRect().top;
    update();
    if (topBefore === undefined) {
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const anchor = filterAnchorRef.current;
        if (!anchor) {
          return;
        }
        const delta = anchor.getBoundingClientRect().top - topBefore;
        if (Math.abs(delta) > 0.5) {
          window.scrollBy({ top: delta, left: 0 });
        }
      });
    });
  }, []);
  const hidden = useMemo(() => new Set(hiddenTypeIds), [hiddenTypeIds]);
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (hidden.has(event.typeId)) {
          return false;
        }
        if (hideNonParticipating && !event.isParticipating) {
          return false;
        }
        return true;
      }),
    [events, hidden, hideNonParticipating],
  );
  const exportEvents = useMemo(
    () => filteredEvents.filter((event) => !isBirthdayScheduleEvent(event)),
    [filteredEvents],
  );
  const filteredUpcoming = useMemo(
    () =>
      upcoming.filter((event) => {
        if (hidden.has(event.typeId) || isBirthdayScheduleEvent(event)) {
          return false;
        }
        if (hideNonParticipating && !event.isParticipating) {
          return false;
        }
        return true;
      }),
    [upcoming, hidden, hideNonParticipating],
  );

  function updateHiddenTypeIds(ids: string[]) {
    preserveScrollAnchor(() => {
      setHiddenTypeIds(ids);
      persistHiddenEventTypeIds(ids);
    });
  }

  function updateHideNonParticipating(value: boolean) {
    preserveScrollAnchor(() => {
      setHideNonParticipating(value);
      persistHideNonParticipating(value);
    });
  }

  function toggleFiltersExpanded() {
    preserveScrollAnchor(() => {
      const next = !filtersExpanded;
      setFiltersExpanded(next);
      persistPlanningFiltersCollapsed(!next);
    });
  }

  const filtersSummary = useMemo(() => {
    const parts: string[] = [];
    if (hiddenTypeIds.length > 0) {
      parts.push(t("planningFiltersSummaryTypesHidden", { count: hiddenTypeIds.length }));
    } else {
      parts.push(t("planningFiltersSummaryAllTypes"));
    }
    if (hideNonParticipating) {
      parts.push(t("planningFiltersSummaryParticipatingOnly"));
    }
    return parts.join(" · ");
  }, [hiddenTypeIds.length, hideNonParticipating, t]);

  return (
    <>
      <PartyBarPlanningReminders reminders={partyBarReminders} />
      <div ref={filterAnchorRef} className="mb-4 [overflow-anchor:none]">
      <Card>
        <button
          type="button"
          onClick={toggleFiltersExpanded}
          aria-expanded={filtersExpanded}
          className="-mx-1 mb-0 flex w-[calc(100%+0.5rem)] items-center justify-between gap-3 rounded-lg px-1 py-0.5 text-left transition hover:bg-stone-50"
        >
          <span className="text-sm font-semibold text-stone-900">{t("planningFilters")}</span>
          <ChevronIcon expanded={filtersExpanded} />
        </button>
        {!filtersExpanded && (
          <p className="mt-2 text-sm text-stone-600">{filtersSummary}</p>
        )}
        {filtersExpanded && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={hideNonParticipating}
                onChange={(event) => updateHideNonParticipating(event.target.checked)}
                className="rounded border-stone-300"
              />
              {t("hideNonParticipatingEvents")}
            </label>
            <EventTypeFilter
              eventTypes={eventTypes}
              hiddenTypeIds={hiddenTypeIds}
              onChange={updateHiddenTypeIds}
            />
          </div>
        )}
      </Card>
      </div>
      <RehearsalCalendar
        events={filteredEvents}
        layoutEvents={events}
        titleActions={
          <>
            {associationCalendarUrl && (
              <FollowAssociationCalendarLink href={associationCalendarUrl} iconOnly />
            )}
            <PlanningImageExportButton
              events={exportEvents}
              startOfDayHour={startOfDayHour}
            />
            {canEditPlanning && planningLocations && planningUsers && (
              <PlanningRehearsalsEditButton
                locations={planningLocations}
                users={planningUsers}
              />
            )}
          </>
        }
      />
      <div className="[overflow-anchor:none]">
        <UpcomingEventsList
          events={filteredUpcoming}
          categoriesFiltered={hiddenTypeIds.length > 0 || hideNonParticipating}
        />
      </div>
    </>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "h-5 w-5 shrink-0 text-stone-500 transition-transform",
        expanded && "rotate-180",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
