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
}: {
  idPrefix: string;
  label?: string;
  help?: string;
  users: AssignUserOption[];
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
  excludedUserIds?: string[];
  maxSelection?: number;
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
    <fieldset className="space-y-3">
      {label && <legend className="text-sm font-medium text-stone-700">{label}</legend>}
      {help && <p className="text-sm text-stone-500">{help}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={`${idPrefix}-search`}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("assignUsersSearchPlaceholder")}
          aria-label={t("search")}
          className="min-w-[12rem] flex-1"
          autoComplete="off"
        />
        <button
          type="button"
          className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline"
          onClick={selectVisible}
        >
          {t("assignUsersSelectVisible")}
        </button>
        <button
          type="button"
          className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline"
          onClick={() => onChange([])}
        >
          {t("assignUsersClearSelection")}
        </button>
      </div>
      {maxSelection !== undefined && (
        <p className="text-xs text-stone-500">
          {t("assignUsersSelectionCount", {
            selected: selectedUserIds.length,
            max: maxSelection,
          })}
        </p>
      )}
      <div
        className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto lg:grid-cols-3"
        role="group"
        aria-label={label}
      >
        {filtered.map((user) => {
          const selected = selectedUserIds.includes(user.id);
          const disabled = atMax && !selected;
          return (
            <button
              key={user.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggle(user.id)}
              className={cn(
                "min-h-10 rounded-lg border px-3 py-2 text-left text-sm font-medium transition",
                selected
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-900 hover:border-stone-400 hover:bg-stone-50",
                disabled && "cursor-not-allowed opacity-50 hover:border-stone-200 hover:bg-white",
              )}
            >
              <span className="block truncate">{user.name}</span>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-stone-500">{t("noUsersMatchSearch")}</p>
      )}
    </fieldset>
  );
}
