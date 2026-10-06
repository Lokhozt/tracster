import { getCurrentUser } from "@/lib/auth";
import { HeaderBar } from "@/components/HeaderBar";
import { SiteFooter } from "@/components/SiteFooter";
import { APP_LOGO_SRC, isS3Configured } from "@/lib/s3";

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

  return (
    <div className="flex min-h-full flex-1 flex-col bg-stone-50 text-stone-900">
      <HeaderBar
        user={
          user
            ? {
                name: user.name,
                role: user.role,
                adminPrivilegesEnabled: user.adminPrivilegesEnabled,
              }
            : null
        }
        logoSrc={isS3Configured() ? APP_LOGO_SRC : null}
      />
      <main
        className={`mx-auto w-full flex-1 px-4 pt-6 pb-6 sm:px-6 sm:pt-8 sm:pb-8 ${user ? "lg:pb-[calc(5rem+env(safe-area-inset-bottom))]" : "sm:pb-[calc(5rem+env(safe-area-inset-bottom))]"} ${wide ? "max-w-screen-2xl" : "max-w-5xl"}`}
      >
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
