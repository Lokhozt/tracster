import { addDays, format, startOfWeek } from "date-fns";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { UnavailabilityCalendar } from "@/components/UnavailabilityCalendar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import {
  getUserUnavailabilityInRange,
  serializeUnavailability,
} from "@/lib/unavailability";
import { formatUserName } from "@/lib/users";
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
  const admin = await isAdmin(user.id);
  const [timeframes, settings, users] = await Promise.all([
    getUserUnavailabilityInRange(user.id, weekStart, weekEnd),
    getSiteSettings(),
    admin
      ? prisma.user.findMany({
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
  ]);

  const userOptions = users.map((entry) => ({
    id: entry.id,
    name: formatUserName(entry),
  }));
  const currentIndex = userOptions.findIndex((entry) => entry.id === user.id);
  if (currentIndex > 0) {
    const [current] = userOptions.splice(currentIndex, 1);
    userOptions.unshift(current);
  }

  return (
    <AppShell title={t("title")}>
      <p className="mb-6 text-stone-600">
        {admin ? t("adminIntro") : t("intro")}
      </p>
      <UnavailabilityCalendar
        currentUserId={user.id}
        users={admin ? userOptions : undefined}
        initialTimeframes={timeframes.map(serializeUnavailability)}
        initialWeekStart={format(weekStart, "yyyy-MM-dd")}
        startOfDayHour={settings.startOfDayHour}
      />
    </AppShell>
  );
}
