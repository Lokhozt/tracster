"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EditIconLink } from "@/components/EditIconLink";
import { Card, Input, Label } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { matchesSearch } from "@/lib/search";
import type { SerializedRepresentation } from "@/lib/representations";

export type RepresentationListItem = {
  representation: SerializedRepresentation;
  canEdit: boolean;
};

function matchesRepresentationSearch(item: RepresentationListItem, query: string): boolean {
  const { representation } = item;
  return matchesSearch(
    query,
    representation.title,
    representation.location,
    representation.notes,
    ...representation.choreographies.map((choreography) => choreography.title),
  );
}

export function RepresentationsList({ items }: { items: RepresentationListItem[] }) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    return items.filter((item) => matchesRepresentationSearch(item, search));
  }, [items, search]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div>
          <Label htmlFor="representation-search">Search</Label>
          <Input
            id="representation-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, location, or choreography…"
            autoComplete="off"
          />
        </div>
        <p className="mt-3 text-sm text-stone-500">
          {filteredItems.length} of {items.length} representations
        </p>
      </div>

      {filteredItems.length === 0 ? (
        <Card>
          <p className="text-stone-600">No representations match your search.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map(({ representation, canEdit }) => (
            <Card key={representation.id} className="transition hover:border-stone-400">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                    Representation
                  </p>
                  <Link
                    href={`/events/${representation.id}`}
                    className="hover:underline"
                  >
                    <h2 className="mt-1 text-lg font-semibold">
                      {representation.title ?? "Representation"}
                    </h2>
                  </Link>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatDateTime(new Date(representation.startsAt))}
                    {representation.endsAt &&
                      ` – ${formatDateTime(new Date(representation.endsAt))}`}
                  </p>
                  {representation.location && (
                    <p className="mt-1 text-sm text-stone-500">{representation.location}</p>
                  )}
                </div>
                {canEdit && (
                  <EditIconLink
                    href={`/events/${representation.id}`}
                    label="Edit representation"
                  />
                )}
              </div>

              <div className="mt-4 border-t border-stone-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Choreographies
                </p>
                {representation.choreographies.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-500">No choreographies linked</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {representation.choreographies.map((choreography) => (
                      <li key={choreography.id}>
                        <Link
                          href={`/choreographies/${choreography.id}`}
                          className="inline-flex rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-800 transition hover:bg-stone-200"
                        >
                          {choreography.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
