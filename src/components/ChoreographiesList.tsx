"use client";

import { useTranslations } from "next-intl";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChoreographerBadge } from "@/components/CrownIcon";
import { Card, Input, Label, Select } from "@/components/ui";
import { useLocale } from "next-intl";

import { persistChoreographyRepresentationFilter } from "@/lib/choreography-list-filter";
import { TagBubbles } from "@/components/TagBubbles";
import { matchesSearch } from "@/lib/search";
import type { TagRecord } from "@/lib/tags";

export type ChoreographyListItem = {
  id: string;
  title: string;
  description: string | null;
  choreographerNames: string[];
  nextRehearsalAt: string | null;
  memberCount: number;
  representationIds: string[];
  representationNames: string[];
  isChoreographer: boolean;
  isInvolved: boolean;
  tags: TagRecord[];
};

export type RepresentationFilterOption = {
  id: string;
  title: string;
  startsAt: string;
};

export function ChoreographiesList({
  choreographies,
  representations,
  tagsVisible,
  canCreate,
  initialRepresentationId,
}: {
  choreographies: ChoreographyListItem[];
  representations: RepresentationFilterOption[];
  tagsVisible: boolean;
  canCreate: boolean;
  initialRepresentationId: string;
}) {
  const t = useTranslations("Components");
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [representationId, setRepresentationId] = useState(initialRepresentationId);
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

  const matchingSearch = useMemo(
    () =>
      matchingRepresentation.filter((choreography) =>
        matchesSearch(
          search,
          choreography.title,
          ...choreography.choreographerNames,
          ...choreography.representationNames,
          ...choreography.tags.map((tag) => tag.name),
        ),
      ),
    [matchingRepresentation, search],
  );

  const visible = useMemo(
    () =>
      showAll
        ? matchingSearch
        : matchingSearch.filter((choreography) => choreography.isInvolved),
    [matchingSearch, showAll],
  );

  function updateRepresentationId(id: string) {
    setRepresentationId(id);
    persistChoreographyRepresentationFilter(id);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <div>
          <Label htmlFor="choreography-search">{t("search")}</Label>
          <Input
            id="choreography-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("choreographySearchPlaceholder")}
            autoComplete="off"
          />
        </div>
        {representations.length > 0 && (
          <div>
            <Label htmlFor="representation-filter">{t("filterByRepresentation")}</Label>
            <Select
              id="representation-filter"
              className="w-full"
              value={representationId}
              onChange={(event) => updateRepresentationId(event.target.value)}
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
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="text-stone-600">
            {representationId && matchingRepresentation.length === 0
              ? t("noChoreographiesForRepresentation")
              : search.trim() && matchingSearch.length === 0
                ? t("noMatchingChoreographies")
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
                    {tagsVisible && (
                      <TagBubbles tags={choreography.tags} className="mt-2" />
                    )}
                    <p className="mt-3 text-xs text-stone-500">
                      {t("choreographyBy", {
                        names: choreography.choreographerNames.join(", "),
                      })}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {choreography.nextRehearsalAt
                        ? t("nextRehearsal", {
                            date: dateFormatter.format(new Date(choreography.nextRehearsalAt)),
                          })
                        : t("noRehearsalScheduled")}
                    </p>
                    {!choreography.isInvolved && (
                      <p className="mt-2 text-xs font-medium text-stone-500">
                        {t("notPartChoreography")}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-sm text-stone-600 sm:text-right">
                    <p>{t("participantCount", {count: choreography.memberCount})}</p>
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
