export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Spreads a link over the whole card so clicking anywhere on the box opens it, without
 * nesting the card's own buttons and links inside an anchor. The card needs `relative`,
 * and any control that must stay clickable needs `aboveCardLink`.
 */
export const cardLink = "after:absolute after:inset-0";

export const aboveCardLink = "relative z-10";

/** "drive.google.com/x" → "https://drive.google.com/x": people rarely type the scheme. */
export function withUrlScheme(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/, "")}`;
}
