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
import {
  listPastPartyBarEventsSinceSeasonStart,
  listUpcomingPartyBarEvents,
  TRAC_BAR_DOCUMENTS_SECTION_ID,
} from "@/lib/party-bar";
import { canManageAllEvents, isAdmin } from "@/lib/roles";

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function DocumentsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [
    t,
    documents,
    categories,
    canEdit,
    upcomingParties,
    canManageParties,
    admin,
    params,
  ] = await Promise.all([
    getTranslations("Pages.Documents"),
    listActiveDocuments(),
    listDocumentCategories(),
    canManageDocuments(user.id),
    listUpcomingPartyBarEvents(),
    canManageAllEvents(user.id),
    isAdmin(user.id),
    searchParams,
  ]);
  const pastParties = admin ? await listPastPartyBarEventsSinceSeasonStart() : [];
  const selectedCategoryId =
    params.category === TRAC_BAR_DOCUMENTS_SECTION_ID ||
    categories.some((category) => category.id === params.category)
      ? params.category
      : undefined;

  return (
    <AppShell title={t("title")} wide>
      <div className="space-y-6">
        {canEdit && (
          <div className="flex justify-end">
            <Link
              href="/documents/new"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              {t("newDocument")}
            </Link>
          </div>
        )}
        <Documents
          documents={documents}
          categories={categories}
          initialCategoryId={selectedCategoryId}
          tracBar={{
            parties: upcomingParties,
            pastParties,
            currentUserId: user.id,
            canManage: canManageParties,
            showPastSeason: admin,
          }}
        />
      </div>
    </AppShell>
  );
}
