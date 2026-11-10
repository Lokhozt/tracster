"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type NavSection = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export type SettingsSection = NavSection;

function resolveSelectedId(
  sections: NavSection[],
  initialSectionId?: string,
): string | undefined {
  if (initialSectionId && sections.some((section) => section.id === initialSectionId)) {
    return initialSectionId;
  }
  return sections[0]?.id;
}

export function SectionNav({
  sections,
  intro,
  initialSectionId,
  categoriesLabel,
  backLabel,
}: {
  sections: NavSection[];
  intro?: string;
  initialSectionId?: string;
  categoriesLabel: string;
  backLabel: string;
}) {
  const [selectedId, setSelectedId] = useState(() =>
    resolveSelectedId(sections, initialSectionId),
  );
  const [mobileOpen, setMobileOpen] = useState(
    () =>
      Boolean(
        initialSectionId && sections.some((section) => section.id === initialSectionId),
      ),
  );
  const panelId = useId();
  const activeId = selectedId ?? sections[0]?.id;

  useEffect(() => {
    const nextId = resolveSelectedId(sections, initialSectionId);
    if (!nextId) {
      return;
    }
    setSelectedId(nextId);
    if (initialSectionId && sections.some((section) => section.id === initialSectionId)) {
      setMobileOpen(true);
    }
  }, [initialSectionId, sections]);

  function selectSection(sectionId: string) {
    setSelectedId(sectionId);
    setMobileOpen(true);
  }

  return (
    <div>
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
              "divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm",
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
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-stone-600 transition hover:text-stone-900 lg:hidden"
          >
            <ChevronLeftIcon />
            {backLabel}
          </button>
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
}: {
  sections: SettingsSection[];
  intro?: string;
  initialSectionId?: string;
}) {
  const t = useTranslations("Pages.Settings");
  return (
    <SectionNav
      sections={sections}
      intro={intro}
      initialSectionId={initialSectionId}
      categoriesLabel={t("categories")}
      backLabel={t("backToCategories")}
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

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
