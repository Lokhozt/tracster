"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Input, Label, Select } from "@/components/ui";
import { formatDurationMinutes } from "@/lib/format-duration";
import type {
  RepresentationParticipantLeaderboardEntry,
  RepresentationStats,
  UserStats,
} from "@/lib/association-stats";
import {
  defaultAssociationStatsPeriodEnd,
  defaultAssociationStatsPeriodStart,
  formatDateInputValue,
} from "@/lib/stats-period-client";
import { cn } from "@/lib/utils";

type RepresentationOption = {
  id: string;
  title: string;
  startsAt: string;
};

type UserOption = {
  id: string;
  name: string;
};

type LeaderboardSortColumn =
  | "name"
  | "choreographyCount"
  | "rehearsalAttendedCount"
  | "attendanceRate"
  | "rehearsalAttendedMinutes";

function leaderboardAttendanceClass(rate: number) {
  if (rate >= 80) {
    return "text-emerald-700";
  }
  if (rate >= 50) {
    return "text-amber-700";
  }
  return "text-rose-700";
}

function LeaderboardSortHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
  className,
}: {
  label: string;
  column: LeaderboardSortColumn;
  activeColumn: LeaderboardSortColumn;
  direction: "asc" | "desc";
  onSort: (column: LeaderboardSortColumn) => void;
  className?: string;
}) {
  const active = column === activeColumn;
  return (
    <th className={cn("px-3 py-2 tabular-nums", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-stone-900",
          active ? "text-stone-900" : "text-stone-600",
        )}
      >
        {label}
        {active && (
          <span className="text-[10px] not-italic" aria-hidden="true">
            {direction === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    </th>
  );
}

function sortLeaderboard(
  rows: RepresentationParticipantLeaderboardEntry[],
  column: LeaderboardSortColumn,
  direction: "asc" | "desc",
): RepresentationParticipantLeaderboardEntry[] {
  const sorted = [...rows];
  const factor = direction === "asc" ? 1 : -1;
  sorted.sort((left, right) => {
    switch (column) {
      case "name":
        return factor * left.name.localeCompare(right.name);
      case "choreographyCount":
        return factor * (left.choreographyCount - right.choreographyCount);
      case "rehearsalAttendedCount":
        return factor * (left.rehearsalAttendedCount - right.rehearsalAttendedCount);
      case "attendanceRate":
        return factor * (left.attendanceRate - right.attendanceRate);
      case "rehearsalAttendedMinutes":
        return factor * (left.rehearsalAttendedMinutes - right.rehearsalAttendedMinutes);
      default:
        return 0;
    }
  });
  return sorted;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums leading-tight text-stone-900">
        {value}
      </p>
    </div>
  );
}

export function AssociationStatsPanel({
  representations,
  users,
}: {
  representations: RepresentationOption[];
  users: UserOption[];
}) {
  const t = useTranslations("Components.associationStats");
  const locale = useLocale();
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale],
  );

  const [mode, setMode] = useState<"representation" | "user">("representation");
  const [representationId, setRepresentationId] = useState("");
  const [userId, setUserId] = useState("");
  const [userRepresentationId, setUserRepresentationId] = useState("");
  const [fromDate, setFromDate] = useState(() =>
    formatDateInputValue(defaultAssociationStatsPeriodStart()),
  );
  const [toDate, setToDate] = useState(() =>
    formatDateInputValue(
      defaultAssociationStatsPeriodEnd(defaultAssociationStatsPeriodStart()),
    ),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [representationStats, setRepresentationStats] = useState<RepresentationStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [leaderboardSort, setLeaderboardSort] = useState<{
    column: LeaderboardSortColumn;
    direction: "asc" | "desc";
  }>({ column: "rehearsalAttendedMinutes", direction: "desc" });

  const sortedLeaderboard = useMemo(() => {
    if (!representationStats?.leaderboard.length) {
      return [];
    }
    return sortLeaderboard(
      representationStats.leaderboard,
      leaderboardSort.column,
      leaderboardSort.direction,
    );
  }, [representationStats?.leaderboard, leaderboardSort]);

  function handleLeaderboardSort(column: LeaderboardSortColumn) {
    setLeaderboardSort((current) => {
      if (current.column === column) {
        return {
          column,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        column,
        direction: column === "name" ? "asc" : "desc",
      };
    });
  }

  const loadRepresentation = useCallback(async (eventId: string) => {
    if (!eventId) {
      setRepresentationStats(null);
      return;
    }
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/settings/stats/representation?eventId=${encodeURIComponent(eventId)}`,
    );
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setRepresentationStats(null);
      setError(typeof data.error === "string" ? data.error : t("loadError"));
      return;
    }
    setRepresentationStats(data.stats as RepresentationStats);
  }, [t]);

  const loadUser = useCallback(
    async (
      selectedUserId: string,
      from: string,
      to: string,
      representationFilterId: string,
    ) => {
      if (!selectedUserId) {
        setUserStats(null);
        return;
      }
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        userId: selectedUserId,
        from,
        to,
      });
      if (representationFilterId) {
        params.set("representationEventId", representationFilterId);
      }
      const response = await fetch(`/api/settings/stats/user?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      setLoading(false);
      if (!response.ok) {
        setUserStats(null);
        setError(typeof data.error === "string" ? data.error : t("loadError"));
        return;
      }
      setUserStats(data.stats as UserStats);
    },
    [t],
  );

  useEffect(() => {
    if (mode === "representation") {
      void loadRepresentation(representationId);
    }
  }, [mode, representationId, loadRepresentation]);

  useEffect(() => {
    setLeaderboardSort({ column: "rehearsalAttendedMinutes", direction: "desc" });
  }, [representationStats?.eventId]);

  useEffect(() => {
    if (mode === "user") {
      void loadUser(userId, fromDate, toDate, userRepresentationId);
    }
  }, [mode, userId, fromDate, toDate, userRepresentationId, loadUser]);

  function representationLabel(item: RepresentationOption) {
    const date = dateFormatter.format(new Date(item.startsAt));
    return item.title.trim() ? `${item.title} · ${date}` : date;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("representation")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            mode === "representation"
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200",
          )}
        >
          {t("modeRepresentation")}
        </button>
        <button
          type="button"
          onClick={() => setMode("user")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            mode === "user"
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200",
          )}
        >
          {t("modeUser")}
        </button>
      </div>

      {mode === "representation" ? (
        <div>
          <Label htmlFor="stats-representation">{t("selectRepresentation")}</Label>
          <Select
            id="stats-representation"
            value={representationId}
            onChange={(event) => setRepresentationId(event.target.value)}
            className="mt-1 w-full max-w-xl"
          >
            <option value="">{t("selectRepresentationPlaceholder")}</option>
            {representations.map((item) => (
              <option key={item.id} value={item.id}>
                {representationLabel(item)}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="stats-user">{t("selectUser")}</Label>
            <Select
              id="stats-user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="mt-1 w-full"
            >
              <option value="">{t("selectUserPlaceholder")}</option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="stats-user-representation">{t("filterRepresentation")}</Label>
            <Select
              id="stats-user-representation"
              value={userRepresentationId}
              onChange={(event) => setUserRepresentationId(event.target.value)}
              className="mt-1 w-full"
            >
              <option value="">{t("allRepresentations")}</option>
              {representations.map((item) => (
                <option key={item.id} value={item.id}>
                  {representationLabel(item)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="stats-from">{t("periodFrom")}</Label>
            <Input
              id="stats-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="stats-to">{t("periodTo")}</Label>
            <Input
              id="stats-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-stone-500">{t("loading")}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {mode === "representation" && representationStats && !loading && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            {representationStats.eventTitle.trim()
              ? representationStats.eventTitle
              : t("representationFallback")}{" "}
            · {dateFormatter.format(new Date(representationStats.eventStartsAt))}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label={t("choreographies")} value={representationStats.choreographyCount} />
            <StatTile label={t("rehearsals")} value={representationStats.rehearsalCount} />
            <StatTile
              label={t("rehearsalDuration")}
              value={formatDurationMinutes(representationStats.rehearsalMinutes)}
            />
            <StatTile label={t("participants")} value={representationStats.participantCount} />
          </div>
          {representationStats.choreographies.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-stone-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-100 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                  <tr>
                    <th className="px-3 py-2">{t("choreography")}</th>
                    <th className="hidden px-3 py-2 tabular-nums sm:table-cell">{t("rehearsals")}</th>
                    <th className="px-3 py-2 tabular-nums">{t("duration")}</th>
                    <th className="hidden px-3 py-2 tabular-nums md:table-cell">
                      {t("participants")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {representationStats.choreographies.map((row) => (
                    <tr key={row.id} className="hover:bg-stone-50/80">
                      <td className="px-3 py-2 font-medium text-stone-900">
                        <Link href={`/choreographies/${row.id}`} className="hover:underline">
                          {row.title}
                        </Link>
                        <div className="mt-0.5 flex gap-3 text-xs text-stone-500 sm:hidden">
                          <span>
                            {t("rehearsals")}: {row.rehearsalCount}
                          </span>
                          <span>
                            {t("participants")}: {row.participantCount}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums text-stone-700 sm:table-cell">
                        {row.rehearsalCount}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-stone-700">
                        {formatDurationMinutes(row.rehearsalMinutes)}
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums text-stone-700 md:table-cell">
                        {row.participantCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {representationStats.leaderboard.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-900">{t("participantLeaderboard")}</h3>
              <div className="overflow-hidden rounded-xl border border-stone-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-100 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    <tr>
                      <th className="w-8 px-2 py-2 tabular-nums">#</th>
                      <LeaderboardSortHeader
                        label={t("participant")}
                        column="name"
                        activeColumn={leaderboardSort.column}
                        direction={leaderboardSort.direction}
                        onSort={handleLeaderboardSort}
                      />
                      <LeaderboardSortHeader
                        label={t("choreographies")}
                        column="choreographyCount"
                        activeColumn={leaderboardSort.column}
                        direction={leaderboardSort.direction}
                        onSort={handleLeaderboardSort}
                        className="hidden sm:table-cell"
                      />
                      <LeaderboardSortHeader
                        label={t("rehearsalAttended")}
                        column="rehearsalAttendedCount"
                        activeColumn={leaderboardSort.column}
                        direction={leaderboardSort.direction}
                        onSort={handleLeaderboardSort}
                      />
                      <LeaderboardSortHeader
                        label={t("rehearsalDurationAttended")}
                        column="rehearsalAttendedMinutes"
                        activeColumn={leaderboardSort.column}
                        direction={leaderboardSort.direction}
                        onSort={handleLeaderboardSort}
                      />
                      <LeaderboardSortHeader
                        label={t("attendance")}
                        column="attendanceRate"
                        activeColumn={leaderboardSort.column}
                        direction={leaderboardSort.direction}
                        onSort={handleLeaderboardSort}
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {sortedLeaderboard.map((row, index) => (
                      <tr key={row.userId} className="hover:bg-stone-50/80">
                        <td className="px-2 py-2 tabular-nums text-stone-500">{index + 1}</td>
                        <td className="px-3 py-2 font-medium text-stone-900">
                          {row.name}
                          <div className="mt-0.5 text-xs text-stone-500 sm:hidden">
                            {t("choreographies")}: {row.choreographyCount}
                          </div>
                        </td>
                        <td className="hidden px-3 py-2 tabular-nums text-stone-700 sm:table-cell">
                          {row.choreographyCount}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-stone-700">
                          {row.rehearsalAttendedCount}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-stone-700">
                          {formatDurationMinutes(row.rehearsalAttendedMinutes)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 tabular-nums font-medium",
                            leaderboardAttendanceClass(row.attendanceRate),
                          )}
                        >
                          {t("attendanceRate", { rate: row.attendanceRate })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "user" && userStats && !loading && (
        <div className="space-y-4">
          {userStats.representationEventId && (
            <p className="text-sm text-stone-600">
              {userStats.representationTitle?.trim()
                ? userStats.representationTitle
                : t("representationFallback")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label={t("choreographies")} value={userStats.choreographyCount} />
            <StatTile label={t("demonstrations")} value={userStats.demonstrationCount} />
            <StatTile label={t("rehearsalAttended")} value={userStats.rehearsalAttended} />
            <StatTile label={t("rehearsalMissed")} value={userStats.rehearsalMissed} />
            <StatTile
              label={t("rehearsalDuration")}
              value={formatDurationMinutes(userStats.rehearsalMinutesAttended)}
            />
            <StatTile
              label={t("unavailability")}
              value={formatDurationMinutes(userStats.unavailabilityMinutes)}
            />
          </div>
          {userStats.choreographies.length > 0 && (
            <Card className="p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                {t("memberChoreographies")}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {userStats.choreographies.map((choreography) => (
                  <li key={choreography.id}>
                    <Link
                      href={`/choreographies/${choreography.id}`}
                      className="inline-flex rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-800 hover:bg-stone-200"
                    >
                      {choreography.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
