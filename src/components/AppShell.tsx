import { getCurrentUser } from "@/lib/auth";
import { ChristmasLights } from "@/components/ChristmasLights";
import { HeaderBar } from "@/components/HeaderBar";
import { SiteFooter } from "@/components/SiteFooter";
import { shouldShowSeasonalStyle } from "@/lib/festive-season";
import { MessageOfTheDayBanner } from "@/components/MessageOfTheDayBanner";
import { getMessageOfTheDay } from "@/lib/motd";
import { getAppLogoSrc } from "@/lib/s3";
import { cn } from "@/lib/utils";

export async function AppShell({
  children,
  title,
  wide = false,
}: {
  children: React.ReactNode;
  title?: React.ReactNode;
  wide?: boolean;
}) {
  const user = await getCurrentUser();
  const messageOfTheDay = getMessageOfTheDay();
  const showChristmasLights = shouldShowSeasonalStyle({
    userDisableSeasonalStyle: user?.disableSeasonalStyle,
  });

  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col text-stone-900",
        showChristmasLights ? "festive-surface" : "bg-stone-50",
      )}
    >
      <div className="sticky top-0 z-40">
        <HeaderBar
          festive={showChristmasLights}
          user={
            user
              ? {
                  name: user.name,
                  role: user.role,
                  adminPrivilegesEnabled: user.adminPrivilegesEnabled,
                }
              : null
          }
          logoSrc={getAppLogoSrc()}
        />
        {showChristmasLights && <ChristmasLights />}
      </div>
      <main
        className={`mx-auto w-full flex-1 px-4 pt-6 pb-6 sm:px-6 sm:pt-8 sm:pb-8 ${user ? "lg:pb-[calc(5rem+env(safe-area-inset-bottom))]" : "sm:pb-[calc(5rem+env(safe-area-inset-bottom))]"} ${wide ? "max-w-screen-2xl" : "max-w-5xl"}`}
      >
        {messageOfTheDay && <MessageOfTheDayBanner message={messageOfTheDay} />}
        {title && (
          <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight break-words sm:text-3xl">
            {title}
          </h1>
        )}
        {children}
      </main>
      <SiteFooter className={user ? "hidden lg:block" : "hidden sm:block"} />
    </div>
  );
}
