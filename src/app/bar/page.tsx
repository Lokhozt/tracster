import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { BarPartyList } from "@/components/BarPartyList";
import { getCurrentUser } from "@/lib/auth";
import { listUpcomingBarParties } from "@/lib/party-bar";

/** Bar tab: the coming parties' bar slots, to take or leave one in a tap. */
export default async function BarPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [t, parties] = await Promise.all([
    getTranslations("Pages.Bar"),
    listUpcomingBarParties(user.id),
  ]);

  return (
    <AppShell title={t("title")}>
      <BarPartyList parties={parties} currentUserId={user.id} />
    </AppShell>
  );
}
