import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { MenuGroup, MenuRow } from "@/components/MenuList";
import { getAppName } from "@/lib/app-name";
import { getCurrentUser } from "@/lib/auth";
import { hasAdminPrivileges } from "@/lib/privileges";

/**
 * "Plus" tab (phones): every destination that has no tab of its own, as a menu. New topics
 * are new rows; each opens its own page, with a back arrow to here.
 */
export default async function MorePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [tNavigation, tAccount, tFooter, tActivity] = await Promise.all([
    getTranslations("Navigation"),
    getTranslations("Account"),
    getTranslations("Footer"),
    getTranslations("Pages.Activity"),
  ]);

  return (
    <AppShell title={tNavigation("more")}>
      <div className="space-y-5">
        <MenuGroup>
          <MenuRow href="/account" icon="user" label={tNavigation("account")} detail={user.name} />
          <MenuRow href="/activity" icon="chart" label={tActivity("title")} />
          <MenuRow href="/documents" icon="folder" label={tNavigation("documents")} />
          <MenuRow href="/calendar-feed" icon="calendar" label={tNavigation("calendarFeed")} />
        </MenuGroup>
        {hasAdminPrivileges(user) && (
          <MenuGroup title={tNavigation("administration")}>
            <MenuRow href="/scheduling" icon="wand" label={tNavigation("scheduling")} />
            <MenuRow href="/settings" icon="gear" label={tNavigation("settings")} />
          </MenuGroup>
        )}
        <MenuGroup title={tAccount("information")}>
          <MenuRow href="/privacy" icon="shield" label={tFooter("privacy")} />
          <MenuRow href="/terms" icon="scroll" label={tFooter("terms")} />
        </MenuGroup>
        <p className="px-1 text-xs text-stone-500">{getAppName()}</p>
      </div>
    </AppShell>
  );
}
