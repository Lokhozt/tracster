"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { SerializedEventType } from "@/lib/event-type-helpers";
import { eventCategoryClassName } from "@/lib/event-category-filter";
import { cn } from "@/lib/utils";

const DOUBLE_CLICK_MS = 400;
const LONG_PRESS_MS = 500;

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
  const lastClickRef = useRef<{ typeId: string; at: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  function toggle(typeId: string) {
    const next = new Set(hidden);
    if (next.has(typeId)) {
      next.delete(typeId);
    } else {
      next.add(typeId);
    }
    onChange([...next]);
  }

  function soloOrShowAll(typeId: string) {
    const allIds = eventTypes.map((type) => type.id);
    const visibleCount = allIds.filter((id) => !hidden.has(id)).length;
    const onlyThisVisible = !hidden.has(typeId) && visibleCount === 1;

    if (onlyThisVisible || visibleCount === 0) {
      onChange([]);
      return;
    }
    onChange(allIds.filter((id) => id !== typeId));
  }

  function handleCategoryClick(typeId: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    const now = Date.now();
    const last = lastClickRef.current;
    if (last?.typeId === typeId && now - last.at < DOUBLE_CLICK_MS) {
      lastClickRef.current = null;
      soloOrShowAll(typeId);
      return;
    }

    lastClickRef.current = { typeId, at: now };
    toggle(typeId);
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handlePointerDown(typeId: string) {
    if (!window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }
    clearLongPressTimer();
    suppressClickRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      longPressTimerRef.current = null;
      lastClickRef.current = null;
      soloOrShowAll(typeId);
    }, LONG_PRESS_MS);
  }

  return (
    <fieldset>
      {/* First child of the fieldset (names the group); floated to share the row with the buttons. */}
      <legend className="float-left mb-2 text-sm font-medium text-stone-700">
        {t("eventTypeFilter")}
      </legend>
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
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
      <div className="clear-both" />

      {/* Long press is a shortcut (solo / show all): keep the phone from selecting the text or
          opening its copy menu instead. */}
      <div className="flex flex-wrap gap-2 select-none [-webkit-touch-callout:none]">
        {eventTypes.map((type) => {
          const selected = !hidden.has(type.id);
          return (
            <button
              key={type.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleCategoryClick(type.id)}
              onPointerDown={() => handlePointerDown(type.id)}
              onPointerUp={clearLongPressTimer}
              onPointerCancel={clearLongPressTimer}
              onPointerLeave={clearLongPressTimer}
              onContextMenu={(event) => event.preventDefault()}
              className={cn(
                "inline-flex min-h-9 select-none items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition [-webkit-touch-callout:none]",
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
