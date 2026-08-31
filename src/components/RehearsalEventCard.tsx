"use client";

import Link from "next/link";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { EditIconLink } from "@/components/EditIconLink";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";

export type RehearsalListItem = {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  groupName: string | null;
  availableNames: string[];
  unavailableNames: string[];
};

export function RehearsalEventCard({
  rehearsal,
  canEdit,
}: {
  rehearsal: RehearsalListItem;
  canEdit: boolean;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{rehearsal.title ?? "Rehearsal"}</h3>
          <p className="mt-1 text-sm text-stone-600">
            {formatDateTime(new Date(rehearsal.startsAt))}
            {rehearsal.endsAt && ` – ${formatDateTime(new Date(rehearsal.endsAt))}`}
          </p>
          {rehearsal.location && (
            <p className="mt-1 text-sm text-stone-500">{rehearsal.location}</p>
          )}
          {rehearsal.groupName && (
            <p className="mt-1 text-sm text-stone-500">Group: {rehearsal.groupName}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/events/${rehearsal.id}`}
            className="text-sm font-medium text-stone-900 hover:underline"
          >
            View details
          </Link>
          {canEdit && (
            <>
              <EditIconLink href={`/events/${rehearsal.id}`} label="Edit rehearsal" />
              <DeleteEventButton
                deleteUrl={`/api/events/${rehearsal.id}`}
                confirmMessage="Delete this rehearsal? This cannot be undone."
              />
            </>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium text-green-700">
              Available ({rehearsal.availableNames.length})
            </p>
            <p className="text-stone-600">
              {rehearsal.availableNames.join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="font-medium text-red-700">
              Unavailable ({rehearsal.unavailableNames.length})
            </p>
            <p className="text-stone-600">
              {rehearsal.unavailableNames.join(", ") || "—"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
