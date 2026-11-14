"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { browserJustAnimated } from "@/lib/ua-transition";
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
  // Opening a section slides it in from the right; back to the overview from the left. Nothing
  // plays on page load (no previous section yet).
  const [previousId, setPreviousId] = useState(activeId);
  const [motion, setMotion] = useState<"forward" | "back" | null>(null);
  if (previousId !== activeId) {
    setPreviousId(activeId);
    // After the phone's own back/forward gesture animation, a second slide would look broken.
    setMotion(browserJustAnimated() ? null : activeId === overviewId ? "back" : "forward");
  }

  return (
    <div>
      {sections.map((section) => (
        <div
          key={section.id}
          className={cn(
            section.id !== activeId && "hidden",
            section.id === activeId && motion === "forward" && "slide-in-forward",
            section.id === activeId && motion === "back" && "slide-in-back",
          )}
        >
          {section.content}
        </div>
      ))}
    </div>
  );
}
