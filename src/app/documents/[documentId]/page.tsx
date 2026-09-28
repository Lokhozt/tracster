import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { DocumentCard } from "@/components/Documents";
import { getCurrentUser } from "@/lib/auth";
import { canManageDocuments, getActiveDocument } from "@/lib/documents";

type PageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function DocumentPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { documentId } = await params;
  const [t, document, canEdit] = await Promise.all([
    getTranslations("Pages.DocumentDetail"),
    getActiveDocument(documentId),
    canManageDocuments(user.id),
  ]);
  if (!document) {
    notFound();
  }

  return (
    <AppShell title={document.title} wide>
      <div className="space-y-4">
        <Link
          href={`/documents?category=${encodeURIComponent(document.category.id)}`}
          className="inline-flex text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          {t("backToCategory", { category: document.category.name })}
        </Link>
        <DocumentCard document={document} canEdit={canEdit} />
      </div>
    </AppShell>
  );
}
