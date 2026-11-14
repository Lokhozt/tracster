import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DocumentForm } from "@/components/Documents";
import type { CreateRouteContent } from "@/components/RouteSheet";
import { getCurrentUser } from "@/lib/auth";
import { canManageDocuments, listDocumentCategories } from "@/lib/documents";

export async function newDocumentContent(): Promise<CreateRouteContent> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!(await canManageDocuments(user.id))) {
    redirect("/documents");
  }
  const [t, categories] = await Promise.all([
    getTranslations("Pages.NewDocument"),
    listDocumentCategories(),
  ]);
  return { title: t("title"), form: <DocumentForm categories={categories} /> };
}
