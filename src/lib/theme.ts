/** Per-device colour theme. "system" (default) follows the device's light/dark setting. */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_COOKIE = "tracster_theme";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const LIGHT_THEME_COLOR = "#ffffff";
export const DARK_THEME_COLOR = "#1c1917";

export function parseThemePreference(value?: string): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** Client only: remember the choice and apply it to the page right away. */
export function applyThemePreference(preference: ThemePreference): void {
  document.cookie = `${THEME_COOKIE}=${preference}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  const root = document.documentElement;
  if (preference === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
}
