"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { replaceUrlInPlace } from "@/lib/app-navigation";
import { cn } from "@/lib/utils";

const SECTION_PARAM = "section";

export type ChoreographyTab = {
  id: string;
  label: string;
  /** Shown as a small badge next to the label (e.g. number of participants). */
  count?: number;
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
 * Opens a section that is not in the tab row (edit form, admin actions) as a new history entry,
 * so the phone's back button returns to the tab the user came from.
 */
export function openChoreographySection(sectionId: string): void {
  window.history.pushState(null, "", urlWithSection(sectionId));
}

/**
 * Link to another tab from a card on the overview. Unlike the tab row (which replaces the URL),
 * this is a step deeper: it adds a history entry, so the back button returns to the overview.
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
 * Choreography page sections as a horizontal, scrollable tab row (fewer taps than a drill-down
 * menu). The active section lives in `?section=`; switching tabs replaces the URL. All sections
 * stay mounted so switching keeps unsaved form input.
 */
export function ChoreographyTabs({
  tabs,
  extraSections = [],
  initialSectionId,
}: {
  tabs: ChoreographyTab[];
  /** Reachable through `openChoreographySection` (header actions), not shown in the tab row. */
  extraSections?: Array<{ id: string; content: React.ReactNode }>;
  initialSectionId?: string;
}) {
  const t = useTranslations("Pages.ChoreographyDetail");
  const searchParams = useSearchParams();
  const panelId = useId();
  const allIds = new Set([...tabs.map((tab) => tab.id), ...extraSections.map((section) => section.id)]);
  const urlSectionId = searchParams.get(SECTION_PARAM);
  // `initialSectionId` (server-side ?section) only applies until the user picks a tab.
  const [initialConsumed, setInitialConsumed] = useState(false);
  const activeId =
    (urlSectionId && allIds.has(urlSectionId) && urlSectionId) ||
    (!initialConsumed && initialSectionId && allIds.has(initialSectionId) && initialSectionId) ||
    tabs[0]?.id;
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Keep the active tab visible in the scrollable row.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  function selectTab(tabId: string) {
    setInitialConsumed(true);
    if (tabId !== activeId) {
      replaceUrlInPlace(urlWithSection(tabId === tabs[0]?.id ? null : tabId));
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("categories")}
        className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-stone-200 px-4 sm:mx-0 sm:px-0"
        data-no-swipe=""
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : undefined}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              onClick={() => selectTab(tab.id)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition",
                isActive
                  ? "border-stone-900 text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-900",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs leading-none",
                    isActive ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel">
        {[...tabs, ...extraSections].map((section) => (
          <div key={section.id} className={cn(section.id !== activeId && "hidden")}>
            {section.content}
          </div>
        ))}
      </div>
    </div>
  );
}
