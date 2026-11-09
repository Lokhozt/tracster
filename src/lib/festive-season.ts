export type SeasonalTheme = "autumn" | "christmas";

function seasonalAllowed(options?: { userDisableSeasonalStyle?: boolean }): boolean {
  if (isSeasonalStyleDisabledByEnv()) {
    return false;
  }
  if (options?.userDisableSeasonalStyle) {
    return false;
  }
  return true;
}

/** 15 October – 30 November (local calendar). */
export function isAutumnSeason(date = new Date()): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 9) {
    return day >= 15;
  }
  if (month === 10) {
    return true;
  }
  return false;
}

/** 1 December – 6 January (local calendar). */
export function isChristmasSeason(date = new Date()): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 11) {
    return true;
  }
  if (month === 0 && day <= 6) {
    return true;
  }
  return false;
}

export function isChristmasLightsSeason(date = new Date()): boolean {
  return isChristmasSeason(date);
}

export function isSeasonalStyleDisabledByEnv(): boolean {
  const value = process.env.DISABLE_SEASONAL_STYLE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function getSeasonalTheme(
  date = new Date(),
  options?: { userDisableSeasonalStyle?: boolean },
): SeasonalTheme | null {
  if (!seasonalAllowed(options)) {
    return null;
  }
  if (isChristmasSeason(date)) {
    return "christmas";
  }
  if (isAutumnSeason(date)) {
    return "autumn";
  }
  return null;
}

export function shouldShowSeasonalStyle(options?: {
  userDisableSeasonalStyle?: boolean;
}): boolean {
  return getSeasonalTheme(new Date(), options) !== null;
}
