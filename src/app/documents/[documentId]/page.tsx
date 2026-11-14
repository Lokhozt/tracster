import { notFound, redirect } from "next/navigation";
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
  const [document, canEdit] = await Promise.all([
    getActiveDocument(documentId),
    canManageDocuments(user.id),
  ]);
  if (!document) {
    notFound();
  }

  return (
    <AppShell title={document.title} wide>
      <div className="space-y-4">
        <DocumentCard document={document} canEdit={canEdit} />
      </div>
    </AppShell>
  );
}
