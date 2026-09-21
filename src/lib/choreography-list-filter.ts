const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const CHOREOGRAPHY_REPRESENTATION_FILTER_COOKIE =
  "tracster_choreography_representation";

export function parseChoreographyRepresentationFilter(value?: string): string {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value).trim();
  } catch {
    return "";
  }
}

export function persistChoreographyRepresentationFilter(id: string) {
  document.cookie = `${CHOREOGRAPHY_REPRESENTATION_FILTER_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
