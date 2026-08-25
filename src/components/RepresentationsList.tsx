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
                  <Link
                    href={`/representations/${representation.id}`}
                    className="hover:underline"
                  >
                    <h2 className="text-lg font-semibold">
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
                <div className="flex items-start gap-3 text-sm text-stone-600">
                  {representation.choreographies.length > 0 ? (
                    <p>
                      {representation.choreographies.length}{" "}
                      {representation.choreographies.length === 1
                        ? "choreography"
                        : "choreographies"}
                    </p>
                  ) : (
                    <p>No choreographies linked</p>
                  )}
                  {canEdit && (
                    <EditIconLink
                      href={`/representations/${representation.id}`}
                      label="Edit representation"
                    />
                  )}
                </div>
              </div>
              {representation.choreographies.length > 0 && (
                <p className="mt-3 text-xs text-stone-500">
                  {representation.choreographies.map((link) => link.title).join(" · ")}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
