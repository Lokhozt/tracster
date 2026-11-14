import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ResourceForm } from "@/components/EventResources";
import type { CreateRouteContent } from "@/components/RouteSheet";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditChoreography } from "@/lib/permissions";

export async function newChoreographyResourceContent(id: string): Promise<CreateRouteContent> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
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
  return { title: t("title"), form: <ResourceForm choreographyId={id} /> };
}
