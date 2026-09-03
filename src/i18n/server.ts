import { cookies } from "next/headers";
import english from "../../messages/server-en.json";
import french from "../../messages/server-fr.json";
import {
  getDefaultLanguage,
  isLanguage,
  LANGUAGE_COOKIE,
  languageFromPreference,
  languageLocales,
} from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth";
import type { EventKind, SerializedEventType } from "@/lib/event-type-helpers";

export type ServerLocale = "en" | "fr";
export type ServerValues = Record<string, string | number>;
export type ServerTranslator = (key: string, values?: ServerValues) => string;

const catalogs = {
  en: english.Server,
  fr: french.Server,
} as const;

function interpolate(template: string, values: ServerValues = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

function readCatalogValue(locale: ServerLocale, key: string): string | undefined {
  if (key.startsWith("messages.")) {
    return (catalogs[locale].messages as Record<string, string>)[
      key.slice("messages.".length)
    ];
  }

  let value: unknown = catalogs[locale];
  for (const segment of key.split(".")) {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === "string" ? value : undefined;
}

export function createServerTranslator(locale: ServerLocale): ServerTranslator {
  return (key, values) => interpolate(readCatalogValue(locale, key) ?? key, values);
}

export async function getServerLocale(
  preference?: "ENGLISH" | "FRENCH" | null,
): Promise<ServerLocale> {
  const preferredLanguage = languageFromPreference(preference);
  if (preferredLanguage) {
    return languageLocales[preferredLanguage];
  }

  try {
    const [cookieStore, user] = await Promise.all([cookies(), getCurrentUser()]);
    const userLanguage = languageFromPreference(user?.displayLanguage);
    if (userLanguage) {
      return languageLocales[userLanguage];
    }
    const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE)?.value;
    if (isLanguage(cookieLanguage)) {
      return languageLocales[cookieLanguage];
    }
  } catch {
    // Server jobs can run outside a request context.
  }

  return languageLocales[getDefaultLanguage()];
}

export async function getServerTranslator(
  preference?: "ENGLISH" | "FRENCH" | null,
): Promise<ServerTranslator> {
  return createServerTranslator(await getServerLocale(preference));
}

export function translateMessageWith(
  t: ServerTranslator,
  message: string,
): string {
  const translated = t(`messages.${message}`);
  if (translated !== `messages.${message}`) {
    return translated;
  }

  const notFoundMatch = /^(.+) not found\.$/.exec(message);
  if (notFoundMatch) {
    const resource = t(`resources.${notFoundMatch[1]}`);
    return t("notFound", {
      resource: resource === `resources.${notFoundMatch[1]}` ? notFoundMatch[1] : resource,
    });
  }

  if (
    /^(Invalid (email address|ISO date|ISO datetime|option|input)|Too (small|big):)/.test(
      message,
    )
  ) {
    return t("messages.Invalid input.");
  }

  return message;
}

export async function translateServerMessage(message: string): Promise<string> {
  return translateMessageWith(await getServerTranslator(), message);
}

export function eventTypeLabel(t: ServerTranslator, kind: EventKind | null, fallback: string) {
  if (!kind) {
    return fallback;
  }
  const label = t(`eventTypes.${kind}`);
  return label === `eventTypes.${kind}` ? fallback : label;
}

export function localizeEventType<T extends Pick<SerializedEventType, "name" | "kind" | "immutable">>(
  type: T,
  t: ServerTranslator,
): T {
  if (!type.immutable || !type.kind) {
    return type;
  }
  return { ...type, name: eventTypeLabel(t, type.kind, type.name) };
}

export function roleLabel(t: ServerTranslator, role: "USER" | "ADMIN" | "OWNER") {
  return t(`roles.${role}`);
}

export function availabilityStatusLabel(
  t: ServerTranslator,
  status: "AVAILABLE" | "UNAVAILABLE" | "MAYBE",
) {
  return t(`statuses.${status}`);
}
