"use client";

import Link from "next/link";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { EditIconLink } from "@/components/EditIconLink";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";

export type RepetitionListItem = {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  groupName: string | null;
  availableNames: string[];
  unavailableNames: string[];
};

export function RepetitionEventCard({
  repetition,
  canEdit,
}: {
  repetition: RepetitionListItem;
  canEdit: boolean;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{repetition.title ?? "Repetition"}</h3>
          <p className="mt-1 text-sm text-stone-600">
            {formatDateTime(new Date(repetition.startsAt))}
            {repetition.endsAt && ` – ${formatDateTime(new Date(repetition.endsAt))}`}
          </p>
          {repetition.location && (
            <p className="mt-1 text-sm text-stone-500">{repetition.location}</p>
          )}
          {repetition.groupName && (
            <p className="mt-1 text-sm text-stone-500">Group: {repetition.groupName}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/repetitions/${repetition.id}`}
            className="text-sm font-medium text-stone-900 hover:underline"
          >
            View details
          </Link>
          {canEdit && (
            <>
              <EditIconLink href={`/repetitions/${repetition.id}`} label="Edit repetition" />
              <DeleteEventButton
                deleteUrl={`/api/repetitions/${repetition.id}`}
                confirmMessage="Delete this repetition? This cannot be undone."
              />
            </>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium text-green-700">
              Available ({repetition.availableNames.length})
            </p>
            <p className="text-stone-600">
              {repetition.availableNames.join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="font-medium text-red-700">
              Unavailable ({repetition.unavailableNames.length})
            </p>
            <p className="text-stone-600">
              {repetition.unavailableNames.join(", ") || "—"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
