"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { FollowAssociationCalendarLink } from "@/components/FollowAssociationCalendarLink";
import { EventTypeFilter } from "@/components/EventTypeFilter";
import { FilterButton, FilterCheckbox, FilterSheet } from "@/components/FilterSheet";
import { type FloatingAction, FloatingActionButton } from "@/components/FloatingActionButton";
import { PlanningImageExportButton } from "@/components/PlanningImageExport";
import { PlanningRehearsalsEditButton } from "@/components/PlanningRehearsalsEditButton";
import { RehearsalCalendar } from "@/components/RehearsalCalendar";
import { PartyBarPlanningReminders } from "@/components/PartyBarPlanningReminders";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { SearchInput } from "@/components/ui";
import type { PartyBarPlanningReminder } from "@/lib/party-bar";
import {
  persistHiddenEventTypeIds,
  persistHideNonParticipating,
} from "@/lib/event-category-filter";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import { isBirthdayScheduleEvent } from "@/lib/schedule-birthdays";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";
import { matchesSearch } from "@/lib/search";

function matchesScheduleSearch(event: SerializedScheduleEvent, query: string): boolean {
  return matchesSearch(
    query,
    event.title,
    event.typeName,
    event.choreographyTitle,
    event.groupName,
    event.location,
    ...event.participantNames,
  );
}

/**
 * The planning: one search + filter row drives both the calendar and the event list below it
 * (this replaced the separate Events tab), plus a "+" to create events on phones.
 */
export function ScheduleOverview({
  events,
  eventTypes,
  initialHiddenTypeIds,
  initialHideNonParticipating,
  associationCalendarUrl,
  startOfDayHour,
  canEditPlanning,
  planningLocations,
  planningUsers,
  partyBarReminders = [],
  createActions = [],
}: {
  events: SerializedScheduleEvent[];
  eventTypes: SerializedEventType[];
  initialHiddenTypeIds: string[];
  initialHideNonParticipating: boolean;
  associationCalendarUrl?: string | null;
  startOfDayHour: number;
  canEditPlanning?: boolean;
  planningLocations?: Array<{ id: string; name: string }>;
  planningUsers?: Array<{ id: string; name: string }>;
  partyBarReminders?: PartyBarPlanningReminder[];
  /** "+" button actions (new event, schedule rehearsals) the viewer is allowed to use. */
  createActions?: FloatingAction[];
}) {
  const t = useTranslations("Components");
  const [hiddenTypeIds, setHiddenTypeIds] = useState(initialHiddenTypeIds);
  const [hideNonParticipating, setHideNonParticipating] = useState(
    initialHideNonParticipating,
  );
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showPast, setShowPast] = useState(false);
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
        return matchesScheduleSearch(event, search);
      }),
    [events, hidden, hideNonParticipating, search],
  );
  const exportEvents = useMemo(
    () => filteredEvents.filter((event) => !isBirthdayScheduleEvent(event)),
    [filteredEvents],
  );
  const listEvents = useMemo(
    () => filteredEvents.filter((event) => !isBirthdayScheduleEvent(event)),
    [filteredEvents],
  );
  const activeFilterCount = hiddenTypeIds.length + (hideNonParticipating ? 1 : 0) + (showPast ? 1 : 0);

  function updateHiddenTypeIds(ids: string[]) {
    setHiddenTypeIds(ids);
    persistHiddenEventTypeIds(ids);
  }

  function updateHideNonParticipating(value: boolean) {
    setHideNonParticipating(value);
    persistHideNonParticipating(value);
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
    if (showPast) {
      parts.push(t("pastEventsShown"));
    }
    return parts.join(" · ");
  }, [hiddenTypeIds.length, hideNonParticipating, showPast, t]);

  return (
    // Wide screens (xl+): fills the window; only the calendar body and the event list scroll.
    <div className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
      <PartyBarPlanningReminders reminders={partyBarReminders} />
      <div className="mb-4 flex gap-2">
        <div className="min-w-0 flex-1">
          <SearchInput
            aria-label={t("search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("planningSearchPlaceholder")}
          />
        </div>
        <FilterButton activeFilterCount={activeFilterCount} onClick={() => setFilterSheetOpen(true)} />
      </div>
      <FloatingActionButton actions={createActions} />
      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title={t("planningFilters")}
        summary={filtersSummary}
      >
        <FilterCheckbox checked={hideNonParticipating} onChange={updateHideNonParticipating}>
          {t("hideNonParticipatingEvents")}
        </FilterCheckbox>
        <FilterCheckbox checked={showPast} onChange={setShowPast}>
          {t("showPastEvents")}
        </FilterCheckbox>
        <EventTypeFilter
          eventTypes={eventTypes}
          hiddenTypeIds={hiddenTypeIds}
          onChange={updateHiddenTypeIds}
        />
      </FilterSheet>
      {/* Wide screens: calendar and event list side by side, sharing the window height. */}
      <div className="xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <RehearsalCalendar
          events={filteredEvents}
          fillHeight
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
        {/* Side column on wide screens: scrolls on its own. */}
        <div className="[overflow-anchor:none] xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <UpcomingEventsList
            events={listEvents}
            includePast={showPast}
            categoriesFiltered={hiddenTypeIds.length > 0 || hideNonParticipating || search.trim() !== ""}
          />
        </div>
      </div>
    </div>
  );
}
