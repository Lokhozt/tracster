import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateUserForm } from "@/components/UserForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/roles";

export default async function NewUserPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!(await canManageUsers(user.id))) {
    redirect("/");
  }

  return (
    <AppShell title="New user">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-stone-600 hover:text-stone-900">
          ← Back to settings
        </Link>
      </div>

      <Card className="max-w-xl">
        <CreateUserForm actorRole={user.role} />
      </Card>
    </AppShell>
  );
}
