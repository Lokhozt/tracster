export const DEFAULT_APP_TIMEZONE = "Europe/Paris";

export function getAppTimezone(): string {
  const value = process.env.APP_TIMEZONE?.trim();
  if (!value) {
    return DEFAULT_APP_TIMEZONE;
  }

  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value });
  } catch {
    throw new Error(
      `APP_TIMEZONE must be an IANA time zone name such as "${DEFAULT_APP_TIMEZONE}".`,
    );
  }

  return value;
}
