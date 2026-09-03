import { addDays, format, startOfWeek } from "date-fns";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { UnavailabilityCalendar } from "@/components/UnavailabilityCalendar";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserUnavailabilityInRange,
  serializeUnavailability,
} from "@/lib/unavailability";
import { getSiteSettings } from "@/lib/site-settings";

export default async function UnavailabilityPage() {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.Unavailability"),
  ]);
  if (!user) {
    redirect("/login");
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  const [timeframes, settings] = await Promise.all([
    getUserUnavailabilityInRange(user.id, weekStart, weekEnd),
    getSiteSettings(),
  ]);

  return (
    <AppShell title={t("title")}>
      <p className="mb-6 text-stone-600">
        {t("intro")}
      </p>
      <UnavailabilityCalendar
        initialTimeframes={timeframes.map(serializeUnavailability)}
        initialWeekStart={format(weekStart, "yyyy-MM-dd")}
        startOfDayHour={settings.startOfDayHour}
      />
    </AppShell>
  );
}
