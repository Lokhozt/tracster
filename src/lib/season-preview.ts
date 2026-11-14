import type { SeasonalTheme } from "@/lib/festive-season";

/** Admins can preview a seasonal theme on their own interface (this browser only). */
export const SEASON_PREVIEW_COOKIE = "tracster_season_preview";

export type SeasonPreview = "auto" | "autumn" | "christmas" | "none";

export function parseSeasonPreview(value: string | undefined): SeasonPreview {
  return value === "autumn" || value === "christmas" || value === "none" ? value : "auto";
}

/** The theme to show: the preview when set, otherwise the date-based one. */
export function applySeasonPreview(
  preview: SeasonPreview,
  dateTheme: SeasonalTheme | null,
): SeasonalTheme | null {
  if (preview === "auto") {
    return dateTheme;
  }
  return preview === "none" ? null : preview;
}
