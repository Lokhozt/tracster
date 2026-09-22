import { getAppTimezone } from "@/lib/timezone";

/**
 * Scheduling reasons in local hours (locations open at 9h, the protected 12h-14h break,
 * 20h closing), and those hours come from the process timezone. Hosts run in UTC, which
 * shifted every generated plan by the offset, so pin the process to the association's zone.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  process.env.TZ = getAppTimezone();
}
