/** Nov 1 – Jan 6 (inclusive), local calendar. */
export function isChristmasLightsSeason(date = new Date()): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 10 || month === 11) {
    return true;
  }
  if (month === 0 && day <= 6) {
    return true;
  }
  return false;
}

export function isSeasonalStyleDisabledByEnv(): boolean {
  const value = process.env.DISABLE_SEASONAL_STYLE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function shouldShowSeasonalStyle(options?: {
  userDisableSeasonalStyle?: boolean;
}): boolean {
  if (isSeasonalStyleDisabledByEnv()) {
    return false;
  }
  if (options?.userDisableSeasonalStyle) {
    return false;
  }
  return isChristmasLightsSeason();
}
