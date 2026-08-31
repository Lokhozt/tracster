"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { formatChoreographyLifecycleWarning } from "@/lib/choreography-lifecycle";

type UpcomingItem = {
  id: string;
  title: string | null;
  startsAt: string;
};

export function ChoreographyLifecycleActions({
  choreographyId,
  title,
  upcomingRehearsals,
  upcomingRepresentations,
}: {
  choreographyId: string;
  title: string;
  upcomingRehearsals: UpcomingItem[];
  upcomingRepresentations: UpcomingItem[];
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"archive" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const impact = {
    rehearsals: upcomingRehearsals.map((item) => ({
      ...item,
      startsAt: new Date(item.startsAt),
    })),
    representations: upcomingRepresentations.map((item) => ({
      ...item,
      startsAt: new Date(item.startsAt),
    })),
  };

  async function runAction(action: "archive" | "delete") {
    const warning = formatChoreographyLifecycleWarning({ action, title, impact });
    if (!confirm(warning)) {
      return;
    }

    setLoadingAction(action);
    setError(null);

    const response = await fetch(
      action === "archive"
        ? `/api/choreographies/${choreographyId}/archive`
        : `/api/choreographies/${choreographyId}`,
      {
        method: action === "archive" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUpcoming: true }),
      },
    );

    const data = await response.json().catch(() => ({}));
    setLoadingAction(null);

    if (!response.ok) {
      setError(data.error ?? `Unable to ${action} choreography.`);
      return;
    }

    router.push("/choreographies");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5">
      <h2 className="mb-1 text-lg font-semibold text-red-950">Admin actions</h2>
      <p className="mb-4 text-sm text-red-800">
        Archiving hides this choreography. Deleting removes it permanently.
        Upcoming rehearsals are deleted and this piece is unlinked from upcoming
        representations.
      </p>
      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={loadingAction !== null}
          onClick={() => runAction("archive")}
        >
          {loadingAction === "archive" ? "Archiving..." : "Archive choreography"}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={loadingAction !== null}
          onClick={() => runAction("delete")}
        >
          {loadingAction === "delete" ? "Deleting..." : "Delete choreography"}
        </Button>
      </div>
    </div>
  );
}
