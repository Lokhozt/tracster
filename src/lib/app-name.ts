export const DEFAULT_APP_NAME = "Tracster";

export function getAppName(): string {
  const value = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  return value || DEFAULT_APP_NAME;
}
