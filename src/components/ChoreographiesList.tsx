"use client";

import { useTranslations } from "next-intl";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChoreographerBadge } from "@/components/CrownIcon";
import { Card, Label, Select } from "@/components/ui";
import { useLocale } from "next-intl";

export type ChoreographyListItem = {
  id: string;
  title: string;
  description: string | null;
  createdByName: string;
  updatedAt: string;
  memberCount: number;
  rehearsalCount: number;
  representationIds: string[];
  isChoreographer: boolean;
  isInvolved: boolean;
};

export type RepresentationFilterOption = {
  id: string;
  title: string;
  startsAt: string;
};

export function ChoreographiesList({
  choreographies,
  representations,
  canCreate,
}: {
  choreographies: ChoreographyListItem[];
  representations: RepresentationFilterOption[];
  canCreate: boolean;
}) {
  const t = useTranslations("Components");
  const [showAll, setShowAll] = useState(false);
  const [representationId, setRepresentationId] = useState("");
  const locale = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"});
  const representationDateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const matchingRepresentation = useMemo(
    () =>
      representationId
        ? choreographies.filter((choreography) =>
            choreography.representationIds.includes(representationId),
          )
        : choreographies,
    [choreographies, representationId],
  );

  const visible = useMemo(
    () =>
      showAll
        ? matchingRepresentation
        : matchingRepresentation.filter((choreography) => choreography.isInvolved),
    [matchingRepresentation, showAll],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
            className="rounded border-stone-300"
          />
          {t("displayAllChoreographies")}
        </label>
        {representations.length > 0 && (
          <div className="sm:min-w-64">
            <Label htmlFor="representation-filter">{t("filterByRepresentation")}</Label>
            <Select
              id="representation-filter"
              className="w-full"
              value={representationId}
              onChange={(event) => setRepresentationId(event.target.value)}
            >
              <option value="">{t("allRepresentations")}</option>
              {representations.map((representation) => (
                <option key={representation.id} value={representation.id}>
                  {representation.title} · {representationDateFormatter.format(new Date(representation.startsAt))}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="text-stone-600">
            {representationId && matchingRepresentation.length === 0
              ? t("noChoreographiesForRepresentation")
              : showAll
                ? canCreate
                  ? t("noChoreographiesCreate")
                  : t("noChoreographies")
                : t("noOwnChoreographies")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visible.map((choreography) => (
            <Link key={choreography.id} href={`/choreographies/${choreography.id}`}>
              <Card className="transition hover:border-stone-400">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      {choreography.isChoreographer && <ChoreographerBadge />}
                      <span>{choreography.title}</span>
                    </h2>
                    {choreography.description && (
                      <p className="mt-1 text-sm text-stone-600">{choreography.description}</p>
                    )}
                    <p className="mt-3 text-xs text-stone-500">
                      {t("createdUpdated", {name: choreography.createdByName, date: dateFormatter.format(new Date(choreography.updatedAt))})}
                    </p>
                    {!choreography.isInvolved && (
                      <p className="mt-2 text-xs font-medium text-stone-500">
                        {t("notPartChoreography")}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-sm text-stone-600 sm:text-right">
                    <p>{t("participantCount", {count: choreography.memberCount})}</p>
                    <p>{t("rehearsalCount", {count: choreography.rehearsalCount})}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
