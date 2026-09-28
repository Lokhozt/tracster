import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { Documents } from "@/components/Documents";
import { getCurrentUser } from "@/lib/auth";
import {
  canManageDocuments,
  listActiveDocuments,
  listDocumentCategories,
} from "@/lib/documents";

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function DocumentsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [t, documents, categories, canEdit, params] = await Promise.all([
    getTranslations("Pages.Documents"),
    listActiveDocuments(),
    listDocumentCategories(),
    canManageDocuments(user.id),
    searchParams,
  ]);
  const selectedCategoryId = categories.some((category) => category.id === params.category)
    ? params.category
    : undefined;

  return (
    <AppShell title={t("title")} wide>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-600">{t("intro")}</p>
          {canEdit && (
            <Link
              href="/documents/new"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              {t("newDocument")}
            </Link>
          )}
        </div>
        <Documents
          documents={documents}
          categories={categories}
          initialCategoryId={selectedCategoryId}
        />
      </div>
    </AppShell>
  );
}
