import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { CreateRouteContent } from "@/components/RouteSheet";
import { CreateUserForm } from "@/components/UserForms";
import { getCurrentUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/roles";

export async function newUserContent(): Promise<CreateRouteContent> {
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
  return { title: t("title"), form: <CreateUserForm actorRole={user.role} /> };
}
