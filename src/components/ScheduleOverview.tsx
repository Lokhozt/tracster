"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EventTypeFilter } from "@/components/EventTypeFilter";
import { FollowAssociationCalendarLink } from "@/components/FollowAssociationCalendarLink";
import { PlanningImageExportButton } from "@/components/PlanningImageExport";
import { PlanningRehearsalsEditButton } from "@/components/PlanningRehearsalsEditButton";
import { RehearsalCalendar } from "@/components/RehearsalCalendar";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { Card } from "@/components/ui";
import {
  persistHiddenEventTypeIds,
  persistHideNonParticipating,
} from "@/lib/event-category-filter";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import { isBirthdayScheduleEvent } from "@/lib/schedule-birthdays";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";

export function ScheduleOverview({
  events,
  upcoming,
  eventTypes,
  initialHiddenTypeIds,
  initialHideNonParticipating,
  associationCalendarUrl,
  startOfDayHour,
  canEditPlanning,
  planningLocations,
  planningUsers,
}: {
  events: SerializedScheduleEvent[];
  upcoming: SerializedScheduleEvent[];
  eventTypes: SerializedEventType[];
  initialHiddenTypeIds: string[];
  initialHideNonParticipating: boolean;
  associationCalendarUrl?: string | null;
  startOfDayHour: number;
  canEditPlanning?: boolean;
  planningLocations?: Array<{ id: string; name: string }>;
  planningUsers?: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations("Components");
  const [hiddenTypeIds, setHiddenTypeIds] = useState(initialHiddenTypeIds);
  const [hideNonParticipating, setHideNonParticipating] = useState(
    initialHideNonParticipating,
  );
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
    setHiddenTypeIds(ids);
    persistHiddenEventTypeIds(ids);
  }

  function updateHideNonParticipating(value: boolean) {
    setHideNonParticipating(value);
    persistHideNonParticipating(value);
  }

  return (
    <>
      <RehearsalCalendar
        events={filteredEvents}
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
      <Card className="mb-4">
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
      </Card>
      <UpcomingEventsList
        events={filteredUpcoming}
        categoriesFiltered={hiddenTypeIds.length > 0 || hideNonParticipating}
      />
    </>
  );
}
