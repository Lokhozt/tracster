"use client";

import { useMemo, useState } from "react";
import { EventTypeFilter } from "@/components/EventTypeFilter";
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
}: {
  events: SerializedScheduleEvent[];
  upcoming: SerializedScheduleEvent[];
  eventTypes: SerializedEventType[];
  initialHiddenTypeIds: string[];
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
      <Card className="mb-4">
        <EventTypeFilter
          eventTypes={eventTypes}
          hiddenTypeIds={hiddenTypeIds}
          onChange={updateHiddenTypeIds}
        />
      </Card>
      <RehearsalCalendar events={filteredEvents} />
      <UpcomingEventsList
        events={filteredUpcoming}
        categoriesFiltered={hiddenTypeIds.length > 0}
      />
    </>
  );
}
