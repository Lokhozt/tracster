"use client";

import { useEffect, useState } from "react";
import type { ParticipantConflicts } from "@/lib/conflicts";

type ConflictState = ParticipantConflicts | null;

export function ParticipantConflictWarnings({
  choreographyId,
  startsAt,
  endsAt,
  groupId,
}: {
  choreographyId: string;
  startsAt: Date | null;
  endsAt: Date | null;
  groupId: string;
}) {
  const [conflicts, setConflicts] = useState<ConflictState>(null);
  const startsAtIso = startsAt?.toISOString() ?? "";
  const endsAtIso = endsAt?.toISOString() ?? "";

  useEffect(() => {
    if (!startsAtIso || (endsAtIso && new Date(endsAtIso) <= new Date(startsAtIso))) {
      setConflicts(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/choreographies/${choreographyId}/rehearsals/conflicts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startsAt: startsAtIso,
              endsAt: endsAtIso || undefined,
              groupId: groupId || undefined,
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          setConflicts(null);
          return;
        }

        const data = (await response.json()) as ParticipantConflicts;
        setConflicts(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setConflicts(null);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [choreographyId, startsAtIso, endsAtIso, groupId]);

  if (!conflicts) {
    return null;
  }

  const hasUnavailable = conflicts.unavailable.length > 0;
  const hasEngaged = conflicts.engaged.length > 0;

  if (!hasUnavailable && !hasEngaged) {
    return null;
  }

  return (
    <div className="space-y-3">
      {hasUnavailable && (
        <ConflictWarning
          title="Following participants are unavailable on this date/time"
          participants={conflicts.unavailable}
        />
      )}
      {hasEngaged && (
        <ConflictWarning
          title="Following participants are unavailable (engaged elsewhere)"
          participants={conflicts.engaged}
        />
      )}
    </div>
  );
}

function ConflictWarning({
  title,
  participants,
}: {
  title: string;
  participants: { id: string; name: string }[];
}) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      <p className="font-medium">{title}</p>
      <ul className="mt-1 list-disc pl-5">
        {participants.map((participant) => (
          <li key={participant.id}>{participant.name}</li>
        ))}
      </ul>
    </div>
  );
}
