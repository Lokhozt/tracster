import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { UsersList } from "@/components/UsersList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageUsers } from "@/lib/roles";
import { adminUserSelect, serializeAdminUser } from "@/lib/users";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!(await canManageUsers(user.id))) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: adminUserSelect,
  });

  return (
    <AppShell title="Users">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-stone-600">
          Manage association members, contact details, and admin access.
        </p>
        <Link
          href="/users/new"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          New user
        </Link>
      </div>

      <UsersList users={users.map(serializeAdminUser)} />
    </AppShell>
  );
}
