import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { CreateUserForm } from "@/components/UserForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/roles";

export default async function NewUserPage() {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.NewUser"),
  ]);
  if (!user) {
    redirect("/login");
  }

  if (!(await canManageUsers(user.id))) {
    redirect("/");
  }

  return (
    <AppShell title={t("title")}>

      <Card className="max-w-xl">
        <CreateUserForm actorRole={user.role} />
      </Card>
    </AppShell>
  );
}
