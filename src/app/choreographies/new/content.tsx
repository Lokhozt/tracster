import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CreateChoreographyForm } from "@/components/CreateChoreographyForm";
import type { CreateRouteContent } from "@/components/RouteSheet";
import { getCurrentUser } from "@/lib/auth";
import { canCreateChoreography } from "@/lib/site-settings";

export async function newChoreographyContent(): Promise<CreateRouteContent> {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pages.NewChoreography"),
  ]);
  if (!user) {
    redirect("/login");
  }
  if (!(await canCreateChoreography(user.id))) {
    redirect("/choreographies");
  }
  return { title: t("title"), form: <CreateChoreographyForm /> };
}
