export const TAG_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const DEFAULT_TAG_COLOR = "#78716c";

export const TAG_COLOR_PRESETS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#78716c",
] as const;

export type TagRecord = {
  id: string;
  name: string;
  color: string;
};

export function serializeTag(tag: TagRecord): TagRecord {
  return {
    id: tag.id,
    name: tag.name,
    color: normalizeTagColor(tag.color),
  };
}

export function normalizeTagColor(color: string): string {
  const trimmed = color.trim();
  if (TAG_COLOR_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return DEFAULT_TAG_COLOR;
}

export function tagTextColor(background: string): "#ffffff" | "#1c1917" {
  const hex = normalizeTagColor(background).slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  return luminance > 0.55 ? "#1c1917" : "#ffffff";
}

function srgb(channel: number) {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
