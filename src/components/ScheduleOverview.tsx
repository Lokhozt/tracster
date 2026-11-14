"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FollowAssociationCalendarLink } from "@/components/FollowAssociationCalendarLink";
import { EventTypeFilter } from "@/components/EventTypeFilter";
import { FilterButton, FilterCheckbox, FilterSheet } from "@/components/FilterSheet";
import { type FloatingAction, FloatingActionButton } from "@/components/FloatingActionButton";
import { PlanningImageExportButton } from "@/components/PlanningImageExport";
import { PlanningRehearsalsEditButton } from "@/components/PlanningRehearsalsEditButton";
import { RehearsalCalendar } from "@/components/RehearsalCalendar";
import { NextUpCard } from "@/components/NextUpCard";
import { PartyBarPlanningReminders } from "@/components/PartyBarPlanningReminders";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { SearchInput, SegmentedControl } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PartyBarPlanningReminder } from "@/lib/party-bar";
import {
  persistHiddenEventTypeIds,
  persistHideNonParticipating,
} from "@/lib/event-category-filter";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import { isBirthdayScheduleEvent } from "@/lib/schedule-birthdays";
import { scheduleEventEnd, scheduleEventLabel } from "@/lib/schedule-filters";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";
import { matchesSearch } from "@/lib/search";

/** Bar filter: one choice, as "my shifts" and "free slots" contradict each other. */
type BarFilter = "all" | "mine" | "free";

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
  const searchParams = useSearchParams();
  const [hiddenTypeIds, setHiddenTypeIds] = useState(initialHiddenTypeIds);
  const [hideNonParticipating, setHideNonParticipating] = useState(
    initialHideNonParticipating,
  );
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showPast, setShowPast] = useState(false);
  // "?bar=free" (e.g. old links to the Trac bar page) opens on the free bar slots.
  const [barFilter, setBarFilter] = useState<BarFilter>(() =>
    searchParams.get("bar") === "free" ? "free" : "all",
  );
  const hidden = useMemo(() => new Set(hiddenTypeIds), [hiddenTypeIds]);
  // A bar choice ("my shifts" / "free slots") is a list of its own: "only events I take part in"
  // and the type filters are paused meanwhile (greyed, values kept).
  const barMode = barFilter !== "all";
  const freeBarSlots = barFilter === "free";
  // With the party type(s) hidden (outside a bar choice, which pauses types) there is no bar to
  // filter on: the Bar choice disappears.
  const partyTypes = eventTypes.filter((type) => type.kind === "PARTY");
  const partiesHidden =
    !barMode && partyTypes.length > 0 && partyTypes.every((type) => hidden.has(type.id));
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (barFilter === "free" && !event.hasFreeBarSlot) {
          return false;
        }
        if (barFilter === "mine" && !event.isBarVolunteer) {
          return false;
        }
        if (!barMode) {
          if (hidden.has(event.typeId)) {
            return false;
          }
          // Holding a bar slot counts as taking part.
          if (hideNonParticipating && !event.isParticipating && !event.isBarVolunteer) {
            return false;
          }
        }
        return matchesScheduleSearch(event, search);
      }),
    [events, barFilter, barMode, hidden, hideNonParticipating, search],
  );
  // "Next up": your next event (taking part or holding a bar slot), whatever the filters.
  const nextUp = useMemo(() => {
    const now = new Date();
    return events.find(
      (event) =>
        !isBirthdayScheduleEvent(event) &&
        (event.isParticipating || event.isBarVolunteer) &&
        scheduleEventEnd(event) > now,
    );
  }, [events]);
  const exportEvents = useMemo(
    () => filteredEvents.filter((event) => !isBirthdayScheduleEvent(event)),
    [filteredEvents],
  );
  const listEvents = useMemo(
    () => filteredEvents.filter((event) => !isBirthdayScheduleEvent(event)),
    [filteredEvents],
  );
  const activeFilterCount =
    (barMode ? 1 : hiddenTypeIds.length) +
    (showPast ? 1 : 0);

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
    if (freeBarSlots) {
      parts.push(t("barFilterFreeSummary"));
    } else if (barFilter === "mine") {
      parts.push(t("onlyMyBarShiftsSummary"));
    } else {
      if (hiddenTypeIds.length > 0) {
        parts.push(t("planningFiltersSummaryTypesHidden", { count: hiddenTypeIds.length }));
      } else {
        parts.push(t("planningFiltersSummaryAllTypes"));
      }
    }
    if (showPast) {
      parts.push(t("pastEventsShown"));
    }
    return parts.join(" · ");
  }, [barFilter, freeBarSlots, hiddenTypeIds.length, showPast, t]);

  const scopeSwitch = (
    <SegmentedControl
      className={cn(barMode && "pointer-events-none opacity-40")}
      label={t("planningScopeLabel")}
      value={hideNonParticipating ? "mine" : "all"}
      onChange={(value) => updateHideNonParticipating(value === "mine")}
      options={[
        { value: "mine", label: t("planningScopeMine") },
        { value: "all", label: t("planningScopeAll") },
      ]}
    />
  );

  return (
    // Wide screens (xl+): fills the window; only the calendar body and the event list scroll.
    <div className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
      {/* Desktop: "Next up" (one line) and the bar reminder side by side, so the calendar
          starts high; phones stack them. */}
      {(nextUp || partyBarReminders.length > 0) && (
        <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:items-stretch">
          {nextUp && (
            <NextUpCard
              layout="strip"
              label={t("nextUpTitle")}
              href={nextUp.href}
              startsAt={nextUp.startsAt}
              endsAt={nextUp.endsAt}
              // A rehearsal is named by its choreography ("Jazz Funk Showcase"), not "Répétition".
              title={
                nextUp.typeKind === "REHEARSAL" && nextUp.choreographyTitle
                  ? nextUp.choreographyTitle
                  : scheduleEventLabel(nextUp)
              }
              subtitle={[nextUp.typeName, nextUp.groupName].filter(Boolean).join(" · ")}
              location={nextUp.location}
            />
          )}
          <PartyBarPlanningReminders
            className={cn(!nextUp && "xl:col-span-2")}
            reminders={partyBarReminders}
            onShowFreeSlots={() => setBarFilter("free")}
          />
        </div>
      )}
      <div className="mb-4 flex gap-2">
        <div className="min-w-0 flex-1">
          <SearchInput
            aria-label={t("search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("planningSearchPlaceholder")}
          />
        </div>
        {/* Desktop: the "Les miens / Tous" switch shares the search row. */}
        <div className="hidden lg:block lg:w-64">{scopeSwitch}</div>
        <FilterButton activeFilterCount={activeFilterCount} onClick={() => setFilterSheetOpen(true)} />
      </div>
      {/* The most used filter, always in sight: my events or everyone's (paused by a bar choice). */}
      <div className="mb-4 lg:hidden">{scopeSwitch}</div>
      <FloatingActionButton actions={createActions} />
      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title={t("planningFilters")}
        summary={filtersSummary}
      >
        {!partiesHidden && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-stone-700">{t("barFilterLabel")}</p>
          <SegmentedControl
            label={t("barFilterLabel")}
            value={barFilter}
            onChange={setBarFilter}
            options={[
              { value: "all", label: t("barFilterAll") },
              { value: "mine", label: t("barFilterMine") },
              { value: "free", label: t("barFilterFree") },
            ]}
          />
          {barMode && (
            <p className="mt-2 text-xs text-stone-500">
              {freeBarSlots ? t("barFilterFreeOverrides") : t("barFilterMineOverrides")}
            </p>
          )}
        </div>
        )}
        <FilterCheckbox checked={showPast} onChange={setShowPast}>
          {t("showPastEvents")}
        </FilterCheckbox>
        {/* Paused (greyed, values kept) while looking for free bar slots. */}
        <fieldset disabled={barMode} className="transition disabled:opacity-40">
          <EventTypeFilter
            eventTypes={eventTypes}
            hiddenTypeIds={hiddenTypeIds}
            onChange={updateHiddenTypeIds}
          />
        </fieldset>
      </FilterSheet>
      {/* Wide screens: calendar and event list side by side, sharing the window height. */}
      <div className="xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_26rem]">
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
            showBarSignup={freeBarSlots}
            includePast={showPast}
            categoriesFiltered={
              activeFilterCount - (showPast ? 1 : 0) > 0 || hideNonParticipating || search.trim() !== ""
            }
            mineOnly={hideNonParticipating && !barMode && search.trim() === ""}
          />
        </div>
      </div>
    </div>
  );
}
