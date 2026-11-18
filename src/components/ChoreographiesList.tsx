"use client";

import { useTranslations } from "next-intl";

import Link from "next/link";
import { useMemo, useRef, useState, ViewTransition } from "react";
import { flushSync } from "react-dom";
import { FilterButton, FilterSheet } from "@/components/FilterSheet";
import { ChoreographerBadge } from "@/components/CrownIcon";
import { Card, Label, SearchInput, Select, SegmentedControl } from "@/components/ui";
import { useLocale } from "next-intl";

import { persistChoreographyRepresentationFilter } from "@/lib/choreography-list-filter";
import { TagBubbles } from "@/components/TagBubbles";
import { matchesSearch } from "@/lib/search";
import { useUrlFilter } from "@/lib/use-url-filter";
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
  // Filters live in the address too, so "back" from a choreography finds them.
  const [scope, setScope] = useUrlFilter("scope", "mine");
  const [search, setSearch] = useUrlFilter("q", "");
  const [representationId, setRepresentationId] = useUrlFilter(
    "representation",
    initialRepresentationId,
    { keepEmpty: true },
  );
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const showAll = scope === "all";
  // Phones: the search field opens from a button (and stays while it holds text).
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchShown = searchOpen || search !== "";
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

  const selectedRepresentation = representations.find(
    (representation) => representation.id === representationId,
  );
  const scopeSwitch = (
    <SegmentedControl
      label={t("choreographyScope")}
      value={showAll ? "all" : "mine"}
      onChange={setScope}
      options={[
        { value: "mine", label: t("myChoreographies") },
        { value: "all", label: t("allChoreographies") },
      ]}
    />
  );

  // Same row as the planning. Phones: "Les miennes / Toutes", a search button and the filters;
  // the search field takes the row while open (or while it holds text). Desktop: field, switch,
  // filters. The rarer representation filter lives in the filter sheet.
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={cn("min-w-0 flex-1", !searchShown && "max-lg:hidden")}>
          <SearchInput
            aria-label={t("search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("choreographySearchPlaceholder")}
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
        <div className="hidden lg:block lg:w-64">{scopeSwitch}</div>
        {representations.length > 0 && (
          <FilterButton
            activeFilterCount={selectedRepresentation ? 1 : 0}
            onClick={() => setFilterSheetOpen(true)}
          />
        )}
      </div>
      {selectedRepresentation && (
        // The sheet is out of sight: say which representation the list is narrowed to.
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-stone-600">
          <span className="min-w-0 break-words">
            {t("filterByRepresentation")} : {selectedRepresentation.title}
          </span>
          <button
            type="button"
            onClick={() => updateRepresentationId("")}
            className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-800"
          >
            {t("clearRepresentationFilter")}
          </button>
        </p>
      )}
      {representations.length > 0 && (
        <FilterSheet
          open={filterSheetOpen}
          onClose={() => setFilterSheetOpen(false)}
          title={t("filters")}
          summary={selectedRepresentation?.title ?? t("allRepresentations")}
        >
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
        </FilterSheet>
      )}

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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {visible.map((choreography) => (
            <Link key={choreography.id} href={`/choreographies/${choreography.id}`}>
              <Card className="h-full p-3 transition hover:border-stone-400 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <h2 className="flex items-center gap-2 font-display text-xl sm:text-2xl">
                      {choreography.isChoreographer && <ChoreographerBadge />}
                      <ViewTransition name={`choreography-title-${choreography.id}`} share="title-morph" default="none">
                        <span className="min-w-0 break-words">{choreography.title}</span>
                      </ViewTransition>
                    </h2>
                    {choreography.description && (
                      <p className="mt-1 line-clamp-2 text-sm break-words text-stone-600 sm:line-clamp-none">
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
                    {/* The next rehearsal is what dancers look for: it reads first among the details. */}
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        choreography.nextRehearsalAt ? "font-medium text-stone-900" : "text-stone-500",
                      )}
                    >
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
