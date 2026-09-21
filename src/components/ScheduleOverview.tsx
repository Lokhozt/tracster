"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EventTypeFilter } from "@/components/EventTypeFilter";
import { FollowAssociationCalendarLink } from "@/components/FollowAssociationCalendarLink";
import { PlanningImageExportButton } from "@/components/PlanningImageExport";
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
}: {
  events: SerializedScheduleEvent[];
  upcoming: SerializedScheduleEvent[];
  eventTypes: SerializedEventType[];
  initialHiddenTypeIds: string[];
  initialHideNonParticipating: boolean;
  associationCalendarUrl?: string | null;
  startOfDayHour: number;
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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {associationCalendarUrl && (
          <FollowAssociationCalendarLink href={associationCalendarUrl} />
        )}
        <PlanningImageExportButton
          events={exportEvents}
          startOfDayHour={startOfDayHour}
        />
      </div>
      <RehearsalCalendar events={filteredEvents} />
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
