"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { replaceUrlInPlace } from "@/lib/app-navigation";
import { cn } from "@/lib/utils";

const SECTION_PARAM = "section";

export type ChoreographySection = {
  id: string;
  content: React.ReactNode;
};

function urlWithSection(sectionId: string | null): string {
  const url = new URL(window.location.href);
  if (sectionId) {
    url.searchParams.set(SECTION_PARAM, sectionId);
  } else {
    url.searchParams.delete(SECTION_PARAM);
  }
  return url.pathname + url.search;
}

/**
 * Opens a section (edit form, admin actions…) as a new history entry, so the phone's back button
 * returns to the overview.
 */
export function openChoreographySection(sectionId: string): void {
  window.history.pushState(null, "", urlWithSection(sectionId));
}

/**
 * Link from an overview card to its section: a step deeper, so it adds a history entry and the
 * back button returns to the overview.
 */
export function ChoreographyTabLink({
  sectionId,
  className,
  children,
}: {
  sectionId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`?${SECTION_PARAM}=${encodeURIComponent(sectionId)}`}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        openChoreographySection(sectionId);
        window.scrollTo({ top: 0 });
      }}
    >
      {children}
    </a>
  );
}

const ADD_PARAM = "add";

/**
 * Asks a section to open its "add" form (e.g. from the floating "+" menu): sets `?add=<kind>`
 * without adding history. The section reads it with `useAddFormRequest`.
 */
export function requestAddForm(kind: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(ADD_PARAM, kind);
  replaceUrlInPlace(url.pathname + url.search);
}

/**
 * For a section whose add form can be opened from elsewhere: `requested` is true while
 * `?add=<kind>` is set; `clear()` removes it (call it when the form closes).
 */
export function useAddFormRequest(kind: string): { requested: boolean; clear: () => void } {
  const searchParams = useSearchParams();
  const requested = searchParams.get(ADD_PARAM) === kind;
  const clear = useCallback(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(ADD_PARAM) === kind) {
      url.searchParams.delete(ADD_PARAM);
      replaceUrlInPlace(url.pathname + url.search);
    }
  }, [kind]);
  return { requested, clear };
}

/**
 * Choreography page: the overview (first section) is a list of cards; each card opens its
 * section (`?section=`) as a history step, so the back button returns to the overview. All
 * sections stay mounted so going back and forth keeps unsaved form input.
 */
export function ChoreographySections({ sections }: { sections: ChoreographySection[] }) {
  const searchParams = useSearchParams();
  const overviewId = sections[0]?.id;
  const ids = new Set(sections.map((section) => section.id));
  // The URL is the only source of truth: a server-rendered copy of ?section can be stale after
  // client-side switches (e.g. when the browser restores the page on "back").
  const urlSectionId = searchParams.get(SECTION_PARAM);
  const activeId = (urlSectionId && ids.has(urlSectionId) && urlSectionId) || overviewId;

  return (
    <div>
      {sections.map((section) => (
        <div key={section.id} className={cn(section.id !== activeId && "hidden")}>
          {section.content}
        </div>
      ))}
    </div>
  );
}
