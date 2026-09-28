import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { ResourceForm } from "@/components/EventResources";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditChoreography } from "@/lib/permissions";

type PageProps = { params: Promise<{ id: string }> };

export default async function NewChoreographyResourcePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const [t, choreography, canEdit] = await Promise.all([
    getTranslations("Pages.NewChoreographyResource"),
    prisma.choreography.findUnique({ where: { id }, select: { id: true } }),
    canEditChoreography(id, user.id),
  ]);
  if (!choreography) {
    notFound();
  }
  if (!canEdit) {
    redirect(`/choreographies/${id}?section=resources`);
  }

  return (
    <AppShell title={t("title")}>
      <div className="mx-auto max-w-xl space-y-4">
        <Link
          href={`/choreographies/${id}?section=resources`}
          className="inline-flex text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          {t("backToChoreography")}
        </Link>
        <Card>
          <ResourceForm choreographyId={id} />
        </Card>
      </div>
    </AppShell>
  );
}
