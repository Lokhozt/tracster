"use client";

import { useTranslations } from "next-intl";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import { eventCategoryClassName } from "@/lib/event-category-filter";
import { cn } from "@/lib/utils";

export function EventTypeFilter({
  eventTypes,
  hiddenTypeIds,
  onChange,
}: {
  eventTypes: SerializedEventType[];
  hiddenTypeIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("Components");
  const hidden = new Set(hiddenTypeIds);

  function toggle(typeId: string) {
    const next = new Set(hidden);
    if (next.has(typeId)) {
      next.delete(typeId);
    } else {
      next.add(typeId);
    }
    onChange([...next]);
  }

  return (
    <fieldset>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <legend className="text-sm font-medium text-stone-700">
          {t("eventTypeFilter")}
        </legend>
        <div className="flex gap-3 text-xs">
          <button
            type="button"
            className="font-medium text-stone-600 hover:text-stone-900 hover:underline"
            onClick={() => onChange([])}
          >
            {t("selectAll")}
          </button>
          <button
            type="button"
            className="font-medium text-stone-600 hover:text-stone-900 hover:underline"
            onClick={() => onChange(eventTypes.map((type) => type.id))}
          >
            {t("deselectAll")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {eventTypes.map((type) => {
          const selected = !hidden.has(type.id);
          return (
            <button
              key={type.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(type.id)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                eventCategoryClassName(type.kind),
                selected
                  ? "shadow-sm"
                  : "bg-white text-stone-500 opacity-55 grayscale hover:opacity-80",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2.5 rounded-full border border-current",
                  selected ? "bg-current" : "bg-transparent",
                )}
              />
              {type.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
