"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";


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
  const t = useTranslations("Components");
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
    const warning = t(action === "archive" ? "archiveChoreographyConfirm" : "deleteChoreographyConfirm", {title, rehearsals: impact.rehearsals.length, representations: impact.representations.length});
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
      setError(data.error ?? t(action === "archive" ? "archiveChoreographyError" : "deleteChoreographyError"));
      return;
    }

    router.push("/choreographies");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5">
      <h2 className="mb-1 text-lg font-semibold text-red-950">{t("adminActions")}</h2>
      <p className="mb-4 text-sm text-red-800">
        {t("lifecycleHelp")}
      </p>
      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={loadingAction !== null}
          onClick={() => runAction("archive")}
        >
          {loadingAction === "archive" ? t("archiving") : t("archiveChoreography")}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={loadingAction !== null}
          onClick={() => runAction("delete")}
        >
          {loadingAction === "delete" ? t("deleting") : t("deleteChoreography")}
        </Button>
      </div>
    </div>
  );
}
