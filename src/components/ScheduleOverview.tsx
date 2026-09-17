"use client";

import { useMemo, useState } from "react";
import { EventTypeFilter } from "@/components/EventTypeFilter";
import { FollowAssociationCalendarLink } from "@/components/FollowAssociationCalendarLink";
import { PlanningImageExportButton } from "@/components/PlanningImageExport";
import { RehearsalCalendar } from "@/components/RehearsalCalendar";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { Card } from "@/components/ui";
import { persistHiddenEventTypeIds } from "@/lib/event-category-filter";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import type { SerializedScheduleEvent } from "@/lib/schedule-filters";

export function ScheduleOverview({
  events,
  upcoming,
  eventTypes,
  initialHiddenTypeIds,
  initialHideNonParticipating,
  associationCalendarUrl,
  startOfDayHour,
}: {
  events: SerializedScheduleEvent[];
  upcoming: SerializedScheduleEvent[];
  eventTypes: SerializedEventType[];
  initialHiddenTypeIds: string[];
  initialHideNonParticipating: boolean;
  associationCalendarUrl?: string | null;
  startOfDayHour: number;
}) {
  const [hiddenTypeIds, setHiddenTypeIds] = useState(initialHiddenTypeIds);
  const hidden = useMemo(() => new Set(hiddenTypeIds), [hiddenTypeIds]);
  const filteredEvents = useMemo(
    () => events.filter((event) => !hidden.has(event.typeId)),
    [events, hidden],
  );
  const filteredUpcoming = useMemo(
    () => upcoming.filter((event) => !hidden.has(event.typeId)),
    [upcoming, hidden],
  );

  function updateHiddenTypeIds(ids: string[]) {
    setHiddenTypeIds(ids);
    persistHiddenEventTypeIds(ids);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {associationCalendarUrl && (
          <FollowAssociationCalendarLink href={associationCalendarUrl} />
        )}
        <PlanningImageExportButton
          events={filteredEvents}
          startOfDayHour={startOfDayHour}
        />
      </div>
      <RehearsalCalendar events={filteredEvents} />
      <Card className="mb-4">
        <EventTypeFilter
          eventTypes={eventTypes}
          hiddenTypeIds={hiddenTypeIds}
          onChange={updateHiddenTypeIds}
        />
      </Card>
      <UpcomingEventsList
        events={filteredUpcoming}
        categoriesFiltered={hiddenTypeIds.length > 0}
        initialHideNonParticipating={initialHideNonParticipating}
      />
    </>
  );
}
