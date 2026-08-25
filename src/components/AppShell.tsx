import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { MainNav } from "@/components/MainNav";
import { AuthNav } from "@/components/AuthNav";
import { RoleBadge } from "@/components/UserForms";

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
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Tracster
            </Link>
            {user && (
              <MainNav showUsersNav={user.role === "ADMIN" || user.role === "OWNER"} />
            )}
          </div>
          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-stone-600">{user.name}</span>
                {(user.role === "ADMIN" || user.role === "OWNER") && (
                  <RoleBadge role={user.role} />
                )}
              </div>
              <LogoutButton />
            </div>
          ) : (
            <AuthNav />
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {title && (
          <h1 className="mb-6 flex items-center gap-2 text-3xl font-semibold tracking-tight">
            {title}
          </h1>
        )}
        {children}
      </main>
    </div>
  );
}
