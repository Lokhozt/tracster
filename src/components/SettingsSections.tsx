"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { replaceUrlInPlace } from "@/lib/app-navigation";
import { cn } from "@/lib/utils";

export type NavSection = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export type SettingsSection = NavSection;

function validSectionId(sections: NavSection[], id: string | null | undefined): string | undefined {
  return id && sections.some((section) => section.id === id) ? id : undefined;
}

function urlWithSection(sectionParam: string, sectionId: string | null): string {
  const url = new URL(window.location.href);
  if (sectionId) {
    url.searchParams.set(sectionParam, sectionId);
  } else {
    url.searchParams.delete(sectionParam);
  }
  return url.pathname + url.search;
}

/**
 * The open section lives in the URL (`?section=…` by default), added with the native History API
 * (no server round-trip), so the phone's back button closes a section like in a native app.
 */
export function SectionNav({
  sections,
  intro,
  initialSectionId,
  sectionParam = "section",
  categoriesLabel,
  title,
}: {
  sections: NavSection[];
  intro?: string;
  /** Section to open on arrival when the URL does not name one (e.g. after an OAuth return). */
  initialSectionId?: string;
  sectionParam?: string;
  categoriesLabel: string;
  /**
   * Page title, rendered here so phones can show the open section's name instead (with a
   * back arrow to the list). Without it, the page keeps its own title.
   */
  title?: string;
}) {
  const searchParams = useSearchParams();
  const urlSectionId = validSectionId(sections, searchParams.get(sectionParam));
  // `initialSectionId` only applies until the user picks or closes a section.
  const [initialConsumed, setInitialConsumed] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | undefined>(undefined);
  const openSectionId =
    urlSectionId ?? (initialConsumed ? undefined : validSectionId(sections, initialSectionId));
  const mobileOpen = Boolean(openSectionId);
  const panelId = useId();
  const activeId = openSectionId ?? lastSelectedId ?? sections[0]?.id;

  function selectSection(sectionId: string) {
    setInitialConsumed(true);
    setLastSelectedId(sectionId);
    if (urlSectionId === sectionId) {
      return;
    }
    const href = urlWithSection(sectionParam, sectionId);
    if (urlSectionId) {
      // Switching sections (desktop sidebar): no need to stack every switch.
      replaceUrlInPlace(href);
    } else {
      window.history.pushState({ sectionNav: true }, "", href);
    }
  }

  // Phones: back to the category list (history step when we opened it, else drop the param).
  function closeSection() {
    setInitialConsumed(true);
    const state: unknown = window.history.state;
    if (urlSectionId && state && typeof state === "object" && "sectionNav" in state) {
      window.history.back();
    } else {
      replaceUrlInPlace(urlWithSection(sectionParam, null));
    }
  }

  const activeLabel = sections.find((section) => section.id === activeId)?.label;

  return (
    <div>
      {title && (
        <div className="mb-6 flex items-center gap-3">
          {mobileOpen && (
            <button
              type="button"
              onClick={closeSection}
              aria-label={categoriesLabel}
              title={categoriesLabel}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-100 hover:text-stone-900 lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
            </button>
          )}
          <h1 className="min-w-0 flex-1 font-display text-3xl break-words sm:text-4xl">
            {/* Phones show one section at a time: its name is the page title. */}
            <span className="lg:hidden">{mobileOpen && activeLabel ? activeLabel : title}</span>
            <span className="max-lg:hidden">{title}</span>
          </h1>
        </div>
      )}
      {intro && (
        <p className={cn("mb-6 text-stone-600", mobileOpen && "max-lg:hidden")}>{intro}</p>
      )}
      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav
          aria-label={categoriesLabel}
          className={cn("block lg:sticky lg:top-24", mobileOpen && "max-lg:hidden")}
        >
          <ul
            className={cn(
              "divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white",
              "lg:space-y-1 lg:divide-y-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none",
            )}
          >
            {sections.map((section) => {
              const isActive = section.id === activeId;

              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => selectSection(section.id)}
                    aria-controls={panelId}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-base font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-900 lg:min-h-11 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm",
                      isActive
                        ? "lg:bg-stone-900 lg:text-white lg:hover:bg-stone-900 lg:hover:text-white"
                        : "lg:bg-transparent lg:text-stone-700 lg:hover:bg-stone-100 lg:hover:text-stone-900",
                    )}
                  >
                    {section.label}
                    <ChevronRightIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          id={panelId}
          className={cn("min-w-0 block", !mobileOpen && "max-lg:hidden")}
        >
          {sections.map((section) => (
            <div key={section.id} className={cn(section.id !== activeId && "hidden")}>
              {section.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Categories on the left, the selected one on the right. Small screens get the same
 * data as a drill-down: the category list fills the width until one is picked, then it
 * gives way to that category alone. Sections stay mounted so switching keeps unsaved
 * form input.
 */
export function SettingsSections({
  sections,
  intro,
  initialSectionId,
  title,
}: {
  sections: SettingsSection[];
  intro?: string;
  initialSectionId?: string;
  title?: string;
}) {
  const t = useTranslations("Pages.Settings");
  return (
    <SectionNav
      sections={sections}
      intro={intro}
      initialSectionId={initialSectionId}
      categoriesLabel={t("categories")}
      title={title}
    />
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-stone-400 lg:hidden"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
