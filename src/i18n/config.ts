export const languages = ["english", "french"] as const;

export type Language = (typeof languages)[number];

export const LANGUAGE_COOKIE = "tracster_language";

export const languageLocales: Record<Language, "en" | "fr"> = {
  english: "en",
  french: "fr",
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && languages.includes(value as Language);
}

export function getDefaultLanguage(): Language {
  const value = process.env.DEFAULT_LANGUAGE?.toLowerCase();
  if (!value) {
    return "french";
  }
  if (!isLanguage(value)) {
    throw new Error('DEFAULT_LANGUAGE must be either "english" or "french".');
  }
  return value;
}

export function languageFromPreference(
  preference: "ENGLISH" | "FRENCH" | null | undefined,
): Language | null {
  if (preference === "ENGLISH") return "english";
  if (preference === "FRENCH") return "french";
  return null;
}

export function preferenceFromLanguage(language: Language): "ENGLISH" | "FRENCH" {
  return language === "english" ? "ENGLISH" : "FRENCH";
}
