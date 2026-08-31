"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChoreographerBadge } from "@/components/CrownIcon";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";

export type ChoreographyListItem = {
  id: string;
  title: string;
  description: string | null;
  createdByName: string;
  updatedAt: string;
  memberCount: number;
  rehearsalCount: number;
  isChoreographer: boolean;
  isInvolved: boolean;
};

export function ChoreographiesList({
  choreographies,
  canCreate,
}: {
  choreographies: ChoreographyListItem[];
  canCreate: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  const visible = useMemo(
    () =>
      showAll
        ? choreographies
        : choreographies.filter((choreography) => choreography.isInvolved),
    [choreographies, showAll],
  );

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(event) => setShowAll(event.target.checked)}
          className="rounded border-stone-300"
        />
        Display all choreographies
      </label>

      {visible.length === 0 ? (
        <Card>
          <p className="text-stone-600">
            {showAll
              ? canCreate
                ? "No choreographies yet. Create your first one."
                : "No choreographies yet."
              : "You are not part of any choreography yet. Check “Display all choreographies” to browse others you can see."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visible.map((choreography) => (
            <Link key={choreography.id} href={`/choreographies/${choreography.id}`}>
              <Card className="transition hover:border-stone-400">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      {choreography.isChoreographer && <ChoreographerBadge />}
                      <span>{choreography.title}</span>
                    </h2>
                    {choreography.description && (
                      <p className="mt-1 text-sm text-stone-600">{choreography.description}</p>
                    )}
                    <p className="mt-3 text-xs text-stone-500">
                      Created by {choreography.createdByName} · Updated{" "}
                      {formatDateTime(new Date(choreography.updatedAt))}
                    </p>
                    {!choreography.isInvolved && (
                      <p className="mt-2 text-xs font-medium text-stone-500">
                        You are not part of this choreography
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-sm text-stone-600 sm:text-right">
                    <p>{choreography.memberCount} participants</p>
                    <p>{choreography.rehearsalCount} rehearsals</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
