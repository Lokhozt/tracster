"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FollowAssociationCalendarLink } from "@/components/FollowAssociationCalendarLink";
import { EventTypeFilter } from "@/components/EventTypeFilter";
import { FilterButton, FilterCheckbox, FilterSheet } from "@/components/FilterSheet";
import {
  CreateSheetMenuItem,
  type FloatingAction,
  FloatingActionButton,
} from "@/components/FloatingActionButton";
import { PlanningImageExportButton } from "@/components/PlanningImageExport";
import { PlanningRehearsalsEditButton } from "@/components/PlanningRehearsalsEditButton";
import { RehearsalCalendar } from "@/components/RehearsalCalendar";
import { NextUpCard } from "@/components/NextUpCard";
import { PartyBarPlanningReminders } from "@/components/PartyBarPlanningReminders";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { SearchInput, SegmentedControl } from "@/components/ui";
import { useUrlFilter } from "@/lib/use-url-filter";
import { cn } from "@/lib/utils";
import type { PartyBarPlanningReminder } from "@/lib/party-bar";
import {
  persistHiddenEventTypeIds,
  persistHideNonParticipating,
} from "@/lib/event-category-filter";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import { isBirthdayScheduleEvent } from "@/lib/schedule-birthdays";
import { scheduleEventLabel } from "@/lib/schedule-filters";
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
  // Filters live in the address too, so "back" from an event finds them (the cookies only give
  // the starting choice of types and scope).
  const [hiddenTypesParam, setHiddenTypesParam] = useUrlFilter(
    "types",
    initialHiddenTypeIds.join(","),
    { keepEmpty: true },
  );
  const [scopeParam, setScopeParam] = useUrlFilter(
    "scope",
    initialHideNonParticipating ? "mine" : "all",
  );
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [search, setSearch] = useUrlFilter("q", "");
  const [pastParam, setPastParam] = useUrlFilter("past", "");
  // "?bar=free" (e.g. old links to the Trac bar page) opens on the free bar slots.
  const [barParam, setBarParam] = useUrlFilter("bar", "");
  const hiddenTypeIds = useMemo(
    () => (hiddenTypesParam ? hiddenTypesParam.split(",") : []),
    [hiddenTypesParam],
  );
  const hideNonParticipating = scopeParam === "mine";
  const showPast = pastParam === "1";
  const barFilter: BarFilter = barParam === "free" || barParam === "mine" ? barParam : "all";
  const setShowPast = (value: boolean) => setPastParam(value ? "1" : "");
  const setBarFilter = (value: BarFilter) => setBarParam(value === "all" ? "" : value);
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
  // An event already under way is skipped: the block always points to what comes next.
  const nextUp = useMemo(() => {
    const now = new Date();
    return events.find(
      (event) =>
        !isBirthdayScheduleEvent(event) &&
        (event.isParticipating || event.isBarVolunteer) &&
        new Date(event.startsAt) > now,
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
    setHiddenTypesParam(ids.join(","));
    persistHiddenEventTypeIds(ids);
  }

  function updateHideNonParticipating(value: boolean) {
    setScopeParam(value ? "mine" : "all");
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

  // Phones: the search field opens from a button (and stays while it holds text).
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchShown = searchOpen || search !== "";
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
              compactOnPhones
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
      {/* One row. Phones: "Les miens / Tous", a search button and the filters; the search field
          takes the row while open (or while it holds text). Desktop: field, switch, filters. */}
      <div className="mb-4 flex items-center gap-2">
        <div className={cn("min-w-0 flex-1", !searchShown && "max-lg:hidden")}>
          <SearchInput
            aria-label={t("search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("planningSearchPlaceholder")}
            ref={searchInputRef}
          />
        </div>
        {searchShown ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSearchOpen(false);
            }}
            aria-label={t("closeSearch")}
            title={t("closeSearch")}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        ) : (
          <>
            <div className="min-w-0 flex-1 lg:hidden">{scopeSwitch}</div>
            <button
              type="button"
              onClick={() => {
                // Show the field, then focus it within the tap so the phone keyboard opens.
                flushSync(() => setSearchOpen(true));
                searchInputRef.current?.focus();
              }}
              aria-label={t("search")}
              title={t("search")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </>
        )}
        {/* Desktop: the "Les miens / Tous" switch shares the search row. */}
        <div className="hidden lg:block lg:w-64">{scopeSwitch}</div>
        <FilterButton activeFilterCount={activeFilterCount} onClick={() => setFilterSheetOpen(true)} />
      </div>
      {/* Phones/tablets: the calendar's export, edit and follow tools live in the "+" menu. */}
      <FloatingActionButton
        actions={createActions}
        extraItems={[
          <CreateSheetMenuItem key="export" kind="export-planning" label={t("exportPlanningImage")} />,
          ...(canEditPlanning && planningLocations && planningUsers
            ? [<CreateSheetMenuItem key="edit" kind="edit-rehearsals" label={t("editPlanningRehearsals")} />]
            : []),
          ...(associationCalendarUrl
            ? [<FollowAssociationCalendarLink key="follow" href={associationCalendarUrl} variant="menu" />]
            : []),
        ]}
      />
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
                // Desktop only: phones get it from the "+" menu.
                <span className="hidden lg:contents">
                  <FollowAssociationCalendarLink href={associationCalendarUrl} iconOnly />
                </span>
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
