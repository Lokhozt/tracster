"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";
import { sortUsersByName } from "@/lib/users";
import { cn } from "@/lib/utils";
import { matchesSearch } from "@/lib/search";

export type AssignUserOption = {
  id: string;
  name: string;
  email?: string;
};

export function UserSelectionMatrix({
  idPrefix,
  label,
  help,
  users,
  selectedUserIds,
  onChange,
  excludedUserIds = [],
  maxSelection,
  hideLabel = false,
}: {
  idPrefix: string;
  label?: string;
  help?: string;
  users: AssignUserOption[];
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
  excludedUserIds?: string[];
  maxSelection?: number;
  /** In a sheet whose title already says it: keep the label for screen readers only. */
  hideLabel?: boolean;
}) {
  const t = useTranslations("Components");
  const [search, setSearch] = useState("");
  const excluded = useMemo(() => new Set(excludedUserIds), [excludedUserIds]);

  const available = useMemo(
    () => sortUsersByName(users.filter((user) => !excluded.has(user.id))),
    [users, excluded],
  );

  const filtered = useMemo(() => {
    // Same matching as the other searches ("helene" finds "Hélène").
    return available.filter((user) => matchesSearch(search, user.name, user.email));
  }, [available, search]);

  function toggle(userId: string) {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
      return;
    }
    if (maxSelection !== undefined && selectedUserIds.length >= maxSelection) {
      return;
    }
    onChange([...selectedUserIds, userId]);
  }

  function selectVisible() {
    const next = [...selectedUserIds];
    for (const user of filtered) {
      if (next.includes(user.id)) {
        continue;
      }
      if (maxSelection !== undefined && next.length >= maxSelection) {
        break;
      }
      next.push(user.id);
    }
    onChange(next);
  }

  if (available.length === 0) {
    return <p className="text-sm text-stone-500">{t("noUsersAvailableToAssign")}</p>;
  }

  const atMax =
    maxSelection !== undefined && selectedUserIds.length >= maxSelection;

  return (
    <fieldset className="space-y-2">
      {label && (
        <legend className={cn("mb-1.5 text-sm font-medium text-stone-800", hideLabel && "sr-only")}>
          {label}
        </legend>
      )}
      {help && <p className="text-sm text-stone-500">{help}</p>}
      <Input
        id={`${idPrefix}-search`}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("assignUsersSearchPlaceholder")}
        aria-label={t("search")}
        autoComplete="off"
      />
      {/* Count and bulk actions on one line, under the search. */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-stone-500 tabular-nums">
          {maxSelection !== undefined
            ? t("assignUsersSelectionCount", { selected: selectedUserIds.length, max: maxSelection })
            : t("assignUsersSelected", { count: selectedUserIds.length })}
        </span>
        <span className="flex gap-1">
          <button
            type="button"
            className="min-h-9 rounded-lg px-2.5 font-medium text-stone-700 hover:bg-stone-100 pointer-coarse:min-h-11"
            onClick={selectVisible}
          >
            {t("assignUsersAll")}
          </button>
          <button
            type="button"
            className="min-h-9 rounded-lg px-2.5 font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 pointer-coarse:min-h-11"
            onClick={() => onChange([])}
            disabled={selectedUserIds.length === 0}
          >
            {t("assignUsersNone")}
          </button>
        </span>
      </div>
      {/* One compact row per person, a check mark when picked (no grid of heavy boxes). */}
      <ul
        className="max-h-[50dvh] divide-y divide-stone-100 overflow-y-auto overscroll-contain rounded-lg border border-stone-200"
        aria-label={label}
      >
        {filtered.map((user) => {
          const selected = selectedUserIds.includes(user.id);
          const disabled = atMax && !selected;
          return (
            <li key={user.id}>
              <button
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => toggle(user.id)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm transition",
                  selected ? "bg-stone-100 font-semibold text-stone-900" : "text-stone-800 hover:bg-stone-50",
                  disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                    selected ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300",
                  )}
                >
                  {selected && (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 truncate">{user.name}</span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-3 py-4 text-sm text-stone-500">{t("noUsersMatchSearch")}</li>
        )}
      </ul>
    </fieldset>
  );
}
