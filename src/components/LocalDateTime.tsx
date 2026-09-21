"use client";

import { useLocale } from "next-intl";
import { formatDateTime } from "@/lib/datetime";

// Rendered on the client so the instant is shown in the viewer's timezone rather
// than the server's, matching the event cards and calendars.
export function LocalDateTime({ value }: { value: string }) {
  const locale = useLocale();
  return (
    <time dateTime={value}>
      {formatDateTime(new Date(value), locale === "fr" ? "fr" : "en")}
    </time>
  );
}
