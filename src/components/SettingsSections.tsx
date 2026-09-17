"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type SettingsSection = {
  id: string;
  label: string;
  content: React.ReactNode;
};

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
  const [openId, setOpenId] = useState<string | null>(
    sections.some((section) => section.id === initialSectionId) ? (initialSectionId ?? null) : null,
  );
  const panelId = useId();
  const activeId = openId ?? sections[0]?.id;

  return (
    <div>
      {intro && (
        <p className={cn("mb-6 text-stone-600", openId && "hidden lg:block")}>{intro}</p>
      )}
      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav
          aria-label={t("categories")}
          className={cn("lg:sticky lg:top-24 lg:block", openId ? "hidden" : "block")}
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
                    onClick={() => setOpenId(section.id)}
                    aria-controls={panelId}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-base font-medium transition lg:min-h-11 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm",
                      // Below lg the list is a menu of unopened categories, so only the one
                      // last opened is marked; from lg on, the highlight tracks the panel.
                      section.id === openId
                        ? "bg-stone-100 text-stone-900"
                        : "text-stone-700 hover:bg-stone-100 hover:text-stone-900",
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

        <div id={panelId} className={cn("min-w-0 lg:block", openId ? "block" : "hidden")}>
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-stone-600 transition hover:text-stone-900 lg:hidden"
          >
            <ChevronLeftIcon />
            {t("backToCategories")}
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
