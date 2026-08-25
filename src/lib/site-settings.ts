import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

export const SITE_SETTINGS_ID = "default";
export const DEFAULT_START_OF_DAY_HOUR = 8;

export type SiteSettingsRecord = {
  allowUserCreateChoreographies: boolean;
  allowUserCreateEvents: boolean;
  startOfDayHour: number;
};

const settingsSelect = {
  allowUserCreateChoreographies: true,
  allowUserCreateEvents: true,
  startOfDayHour: true,
} as const;

export function serializeSiteSettings(settings: SiteSettingsRecord): SiteSettingsRecord {
  return {
    allowUserCreateChoreographies: settings.allowUserCreateChoreographies,
    allowUserCreateEvents: settings.allowUserCreateEvents,
    startOfDayHour: settings.startOfDayHour,
  };
}

export async function getSiteSettings(): Promise<SiteSettingsRecord> {
  const existing = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
    select: settingsSelect,
  });

  if (existing) {
    return serializeSiteSettings(existing);
  }

  return serializeSiteSettings(
    await prisma.siteSettings.create({
      data: {
        id: SITE_SETTINGS_ID,
        allowUserCreateChoreographies: true,
        allowUserCreateEvents: true,
        startOfDayHour: DEFAULT_START_OF_DAY_HOUR,
      },
      select: settingsSelect,
    }),
  );
}

export async function canCreateChoreography(userId: string): Promise<boolean> {
  if (await isAdmin(userId)) {
    return true;
  }

  const settings = await getSiteSettings();
  return settings.allowUserCreateChoreographies;
}

export async function canCreateEvent(userId: string): Promise<boolean> {
  if (await isAdmin(userId)) {
    return true;
  }

  const settings = await getSiteSettings();
  return settings.allowUserCreateEvents;
}
