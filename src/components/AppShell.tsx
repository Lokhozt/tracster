import { getCurrentUser } from "@/lib/auth";
import { HeaderBar } from "@/components/HeaderBar";
import { APP_LOGO_SRC, isS3Configured } from "@/lib/s3";

export async function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <HeaderBar
        user={
          user
            ? {
                name: user.name,
                role: user.role,
              }
            : null
        }
        logoSrc={isS3Configured() ? APP_LOGO_SRC : null}
      />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {title && (
          <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold tracking-tight break-words sm:text-3xl">
            {title}
          </h1>
        )}
        {children}
      </main>
    </div>
  );
}
