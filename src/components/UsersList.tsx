"use client";

import { useTranslations } from "next-intl";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CompetitorBadge, RoleBadge } from "@/components/UserForms";
import { Card, Input, Label, SETTINGS_LIST_CLASS, Select } from "@/components/ui";
import type { UserRole } from "@/generated/prisma/client";
import { type AdminUser, compareUsersByName } from "@/lib/users";



function matchesSearch(user: AdminUser, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    user.name,
    user.firstName,
    user.lastName,
    user.email,
    user.phone ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return normalized.split(/\s+/).every((term) => haystack.includes(term));
}

export function UsersList({ users }: { users: AdminUser[] }) {
  const t = useTranslations("Components");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [competitorFilter, setCompetitorFilter] = useState<"ALL" | "YES" | "NO">("ALL");

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        if (roleFilter !== "ALL" && user.role !== roleFilter) {
          return false;
        }
        if (competitorFilter === "YES" && !user.isCompetitor) {
          return false;
        }
        if (competitorFilter === "NO" && user.isCompetitor) {
          return false;
        }
        return matchesSearch(user, search);
      })
      .sort(compareUsersByName);
  }, [users, search, roleFilter, competitorFilter]);

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="max-lg:sr-only text-lg font-semibold">{t("users")}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {t("usersHelp")}
          </p>
        </div>
        <Link
          href="/users/new"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          {t("newUser")}
        </Link>
      </div>

      {/* Phones: search on its own row, the two filters side by side below it. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_180px_180px] sm:gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="user-search">{t("search")}</Label>
          <Input
            id="user-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("userSearchPlaceholder")}
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="user-role-filter">{t("role")}</Label>
          <Select
            id="user-role-filter"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as UserRole | "ALL")
            }
            className="w-full"
          >
            <option value="ALL">{t("allRoles")}</option>
            <option value="USER">{t("roleUSER")}</option>
            <option value="MANAGER">{t("roleMANAGER")}</option>
            <option value="ADMIN">{t("roleADMIN")}</option>
            <option value="OWNER">{t("roleOWNER")}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="user-competitor-filter">{t("competitorStatus")}</Label>
          <Select
            id="user-competitor-filter"
            value={competitorFilter}
            onChange={(event) =>
              setCompetitorFilter(event.target.value as "ALL" | "YES" | "NO")
            }
            className="w-full"
          >
            <option value="ALL">{t("allCompetitorStatuses")}</option>
            <option value="YES">{t("competitorsOnly")}</option>
            <option value="NO">{t("nonCompetitorsOnly")}</option>
          </Select>
        </div>
      </div>
      <p className="mt-3 text-sm text-stone-500">
        {t("usersShown", {shown: filteredUsers.length, total: users.length})}
      </p>

      <div className="mt-3">
        {filteredUsers.length === 0 ? (
          <p className="text-sm text-stone-600">{t("noMatchingUsers")}</p>
        ) : (
          // One line per member (name, role, competition, e-mail): details are on their page.
          <ul className={SETTINGS_LIST_CLASS}>
            {filteredUsers.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/users/${entry.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 px-3 py-2 transition hover:bg-stone-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{entry.name}</span>
                      {entry.role !== "USER" && <RoleBadge role={entry.role} />}
                      {entry.isCompetitor && <CompetitorBadge />}
                    </span>
                    <span className="block truncate text-xs text-stone-500">{entry.email}</span>
                  </span>
                  <span aria-hidden="true" className="text-stone-400">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
