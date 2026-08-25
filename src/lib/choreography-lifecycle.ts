import { formatDateTime } from "@/lib/datetime";

export type UpcomingLinkedItem = {
  id: string;
  title: string | null;
  startsAt: Date;
};

export type UpcomingChoreographyImpact = {
  repetitions: UpcomingLinkedItem[];
  representations: UpcomingLinkedItem[];
};

export function hasUpcomingImpact(impact: UpcomingChoreographyImpact) {
  return impact.repetitions.length > 0 || impact.representations.length > 0;
}

function listUpcomingItems(items: UpcomingLinkedItem[], fallbackTitle: string) {
  return items
    .map((item) => `• ${item.title || fallbackTitle} (${formatDateTime(item.startsAt)})`)
    .join("\n");
}

export function formatChoreographyLifecycleWarning(options: {
  action: "archive" | "delete";
  title: string;
  impact: UpcomingChoreographyImpact;
}) {
  const { action, title, impact } = options;
  const intro =
    action === "archive"
      ? `Archive “${title}”? It will no longer be visible.`
      : `Delete “${title}”? This cannot be undone.`;

  if (!hasUpcomingImpact(impact)) {
    return intro;
  }

  const sections: string[] = [
    intro,
    "",
    "Upcoming linked events will be affected:",
  ];

  if (impact.repetitions.length > 0) {
    sections.push(
      "",
      `Upcoming repetitions will be deleted:\n${listUpcomingItems(impact.repetitions, "Repetition")}`,
    );
  }

  if (impact.representations.length > 0) {
    sections.push(
      "",
      `This choreography will be removed from upcoming representations:\n${listUpcomingItems(impact.representations, "Representation")}`,
    );
  }

  return sections.join("\n");
}
