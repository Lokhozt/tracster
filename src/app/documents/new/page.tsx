import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { DocumentForm } from "@/components/Documents";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { canManageDocuments, listDocumentCategories } from "@/lib/documents";

export default async function NewDocumentPage() {
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

  return (
    <AppShell title={t("title")}>
      <div className="mx-auto max-w-xl space-y-4">
        <Link href="/documents" className="inline-flex text-sm font-medium text-stone-600 hover:text-stone-900">
          {t("backToDocuments")}
        </Link>
        <Card>
          <DocumentForm categories={categories} />
        </Card>
      </div>
    </AppShell>
  );
}
