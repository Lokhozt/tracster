import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  EditUserForm,
  RoleBadge,
  TransferOwnershipForm,
  UserRoleForm,
} from "@/components/UserForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageUsers, isOwner } from "@/lib/roles";
import { adminUserSelect, serializeAdminUser } from "@/lib/users";

type PageProps = { params: Promise<{ id: string }> };

export default async function UserDetailPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  if (!(await canManageUsers(currentUser.id))) {
    redirect("/");
  }

  const { id } = await params;

  const [target, allUsers, ownerIsCurrentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: adminUserSelect,
    }),
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: adminUserSelect,
    }),
    isOwner(currentUser.id),
  ]);

  if (!target) {
    notFound();
  }

  const user = serializeAdminUser(target);
  const serializedUsers = allUsers.map(serializeAdminUser);

  return (
    <AppShell title={user.name}>
      <div className="mb-6">
        <Link href="/users" className="text-sm text-stone-600 hover:text-stone-900">
          ← Back to users
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <RoleBadge role={user.role} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <EditUserForm user={user} />
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Role</h2>
            <UserRoleForm user={user} actorRole={currentUser.role} />
          </Card>

          {ownerIsCurrentUser && user.role === "OWNER" && (
            <Card>
              <h2 className="mb-2 text-lg font-semibold">Transfer ownership</h2>
              <p className="mb-4 text-sm text-stone-600">
                Transfer the owner role to another user. You will become a regular user.
                This is the only way to change who holds the owner role.
              </p>
              <TransferOwnershipForm
                users={serializedUsers}
                currentUserId={currentUser.id}
              />
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
