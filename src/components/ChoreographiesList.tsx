"use client";

import { useTranslations } from "next-intl";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChoreographerBadge } from "@/components/CrownIcon";
import { Card, Label, SearchInput, Select } from "@/components/ui";
import { useLocale } from "next-intl";

import { persistChoreographyRepresentationFilter } from "@/lib/choreography-list-filter";
import { TagBubbles } from "@/components/TagBubbles";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
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
      <div className="grid gap-2 sm:grid-cols-2 sm:items-end sm:gap-3">
        <div>
          {/* Labels stay for screen readers; on phones the placeholder and icon say enough. */}
          <Label htmlFor="choreography-search" className="max-sm:sr-only">
            {t("search")}
          </Label>
          <SearchInput
            id="choreography-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("choreographySearchPlaceholder")}
          />
        </div>
        {representations.length > 0 && (
          <div>
            <Label htmlFor="representation-filter" className="max-sm:sr-only">
              {t("filterByRepresentation")}
            </Label>
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

      <div
        role="group"
        aria-label={t("choreographyScope")}
        className="flex rounded-lg border border-stone-300 bg-white/60 p-0.5 sm:inline-flex"
      >
        {[
          { value: false, label: t("myChoreographies") },
          { value: true, label: t("allChoreographies") },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setShowAll(option.value)}
            aria-pressed={showAll === option.value}
            className={cn(
              "flex-1 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition",
              showAll === option.value
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-100",
            )}
          >
            {option.label}
          </button>
        ))}
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
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {visible.map((choreography) => (
            <Link key={choreography.id} href={`/choreographies/${choreography.id}`}>
              <Card className="h-full p-3 transition hover:border-stone-400 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <h2 className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                      {choreography.isChoreographer && <ChoreographerBadge />}
                      <span>{choreography.title}</span>
                    </h2>
                    {choreography.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-stone-600 sm:line-clamp-none">
                        {choreography.description}
                      </p>
                    )}
                    {tagsVisible && (
                      <TagBubbles tags={choreography.tags} className="mt-2" />
                    )}
                    <p className="mt-2 text-xs text-stone-500 sm:mt-3">
                      {t("choreographyBy", {
                        names: choreography.choreographerNames.join(", "),
                      })}
                      <span className="sm:hidden">
                        {" · "}
                        {t("participantCount", { count: choreography.memberCount })}
                      </span>
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
                  <div className="hidden shrink-0 text-sm text-stone-600 sm:block sm:text-right">
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
