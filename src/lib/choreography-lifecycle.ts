import { formatDateTime } from "@/lib/datetime";

type MessageTranslator = (key: string, values?: Record<string, string | number>) => string;

const englishMessages: MessageTranslator = (key, values = {}) => {
  const messages: Record<string, string> = {
    "lifecycle.archive": "Archive “{title}”? It will no longer be visible.",
    "lifecycle.delete": "Delete “{title}”? This cannot be undone.",
    "lifecycle.affected": "Upcoming linked events will be affected:",
    "lifecycle.rehearsals": "Upcoming rehearsals will be deleted:\n{items}",
    "lifecycle.representations":
      "This choreography will be removed from upcoming representations:\n{items}",
    "eventTypes.REHEARSAL": "Rehearsal",
    "eventTypes.REPRESENTATION": "Representation",
  };
  return (messages[key] ?? key).replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
};

export type UpcomingLinkedItem = {
  id: string;
  title: string | null;
  startsAt: Date;
};

export type UpcomingChoreographyImpact = {
  rehearsals: UpcomingLinkedItem[];
  representations: UpcomingLinkedItem[];
};

export function hasUpcomingImpact(impact: UpcomingChoreographyImpact) {
  return impact.rehearsals.length > 0 || impact.representations.length > 0;
}

function listUpcomingItems(
  items: UpcomingLinkedItem[],
  fallbackTitle: string,
  locale: "en" | "fr",
) {
  return items
    .map(
      (item) =>
        `• ${item.title || fallbackTitle} (${formatDateTime(item.startsAt, locale)})`,
    )
    .join("\n");
}

export function formatChoreographyLifecycleWarning(options: {
  action: "archive" | "delete";
  title: string;
  impact: UpcomingChoreographyImpact;
  t?: MessageTranslator;
  locale?: "en" | "fr";
}) {
  const { action, title, impact, t = englishMessages, locale = "en" } = options;
  const intro = t(`lifecycle.${action}`, { title });

  if (!hasUpcomingImpact(impact)) {
    return intro;
  }

  const sections: string[] = [
    intro,
    "",
    t("lifecycle.affected"),
  ];

  if (impact.rehearsals.length > 0) {
    sections.push(
      "",
      t("lifecycle.rehearsals", {
        items: listUpcomingItems(
          impact.rehearsals,
          t("eventTypes.REHEARSAL"),
          locale,
        ),
      }),
    );
  }

  if (impact.representations.length > 0) {
    sections.push(
      "",
      t("lifecycle.representations", {
        items: listUpcomingItems(
          impact.representations,
          t("eventTypes.REPRESENTATION"),
          locale,
        ),
      }),
    );
  }

  return sections.join("\n");
}
