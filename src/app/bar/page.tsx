import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { BarPartyList } from "@/components/BarPartyList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listUpcomingBarParties } from "@/lib/party-bar";
import { basicUserSelect, serializeBasicUser, userNameOrderBy } from "@/lib/users";

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
  // Organisers can fill free slots: they pick among the members.
  const users = parties.some((party) => party.canManage)
    ? (await prisma.user.findMany({ orderBy: userNameOrderBy, select: basicUserSelect })).map(
        serializeBasicUser,
      )
    : [];

  return (
    <AppShell title={t("title")}>
      <BarPartyList parties={parties} currentUserId={user.id} users={users} />
    </AppShell>
  );
}
