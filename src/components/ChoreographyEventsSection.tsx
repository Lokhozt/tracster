"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RehearsalsSection } from "@/components/ChoreographyForms";
import { DemonstrationsSection } from "@/components/EventForms";
import type { LinkedEventItem } from "@/components/EventForms";
import { Switch } from "@/components/ui";
import type { GroupOption } from "@/components/GroupForms";
import type { RepresentationItem } from "@/components/RepresentationForms";
import { RepresentationsSection } from "@/components/RepresentationForms";
import type { RehearsalListItem } from "@/components/RehearsalEventCard";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import { isUpcomingScheduleEvent } from "@/lib/schedule-filters";
import { useUrlFilter } from "@/lib/use-url-filter";

type ParticipantOption = { id: string; name: string; email: string; firstName?: string; lastName?: string };

function visibleScheduleEvents<T extends { startsAt: string; endsAt: string | null }>(
  items: T[],
  showPast: boolean,
  now: Date,
): T[] {
  return showPast ? items : items.filter((item) => isUpcomingScheduleEvent(item, now));
}

export function ChoreographyEventsSection({
  choreographyId,
  choreographyTitle,
  canEdit,
  canViewStatistics,
  eventTypes,
  groups,
  participantOptions,
  showRepresentations,
  showDemonstrations,
  rehearsals,
  representations,
  demonstrations,
}: {
  choreographyId: string;
  choreographyTitle: string;
  canEdit: boolean;
  canViewStatistics: boolean;
  eventTypes: SerializedEventType[];
  groups: GroupOption[];
  participantOptions: ParticipantOption[];
  showRepresentations: boolean;
  showDemonstrations: boolean;
  rehearsals: RehearsalListItem[];
  representations: RepresentationItem[];
  demonstrations: LinkedEventItem[];
}) {
  const t = useTranslations("Components");
  // In the address, so coming back from an event keeps past events shown.
  const [pastParam, setPastParam] = useUrlFilter("past", "");
  const showPast = pastParam === "1";
  const setShowPast = (value: boolean) => setPastParam(value ? "1" : "");
  const [now] = useState(() => new Date());

  const visibleRehearsals = useMemo(
    () => visibleScheduleEvents(rehearsals, showPast, now),
    [rehearsals, showPast, now],
  );
  const visibleRepresentations = useMemo(
    () => visibleScheduleEvents(representations, showPast, now),
    [representations, showPast, now],
  );
  const visibleDemonstrations = useMemo(
    () => visibleScheduleEvents(demonstrations, showPast, now),
    [demonstrations, showPast, now],
  );

  return (
    <div className="space-y-8">
      <label className="flex cursor-pointer items-center justify-end gap-3">
        <span className="text-sm text-stone-600">{t("showPastEvents")}</span>
        <Switch checked={showPast} onChange={setShowPast} label={t("showPastEvents")} />
      </label>
      <section>
        <RehearsalsSection
          actionsInFloatingMenu
          canViewStatistics={canViewStatistics}
          choreographyId={choreographyId}
          choreographyTitle={choreographyTitle}
          canEdit={canEdit}
          groups={groups}
          eventTypes={eventTypes}
          rehearsals={visibleRehearsals}
        />
      </section>
      {showRepresentations && (
        <section>
          <RepresentationsSection
            actionsInFloatingMenu
            choreographyId={choreographyId}
            canEdit={canEdit}
            eventTypes={eventTypes}
            representations={visibleRepresentations}
          />
        </section>
      )}
      {showDemonstrations && (
        <section>
          <DemonstrationsSection
            actionsInFloatingMenu
            choreographyId={choreographyId}
            choreographyTitle={choreographyTitle}
            canEdit={canEdit}
            eventTypes={eventTypes}
            participantOptions={participantOptions}
            groups={groups}
            demonstrations={visibleDemonstrations}
          />
        </section>
      )}
    </div>
  );
}