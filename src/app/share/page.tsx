import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { ShareToResource } from "@/components/ShareToResource";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_RESOURCE_BYTES } from "@/lib/resource-media";
import { hasGlobalAccess } from "@/lib/roles";
import { isS3Configured } from "@/lib/s3";

type PageProps = {
  searchParams: Promise<{ missed?: string }>;
};

/**
 * Landing page of "Share → TRACker" (Android share sheet): turns the shared video, photo,
 * audio or link into a resource of a choreography the member can edit.
 */
export default async function SharePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    // The shared file stays on the phone (service worker cache) until after signing in.
    redirect("/login");
  }

  const [t, params, globalAccess] = await Promise.all([
    getTranslations("Pages.Share"),
    searchParams,
    hasGlobalAccess(user.id),
  ]);
  // Same rule as adding a resource on the choreography page (canEditChoreography).
  const choreographies = await prisma.choreography.findMany({
    where: {
      archivedAt: null,
      ...(globalAccess
        ? {}
        : { OR: [{ createdById: user.id }, { choreographers: { some: { userId: user.id } } }] }),
    },
    select: {
      id: true,
      title: true,
      createdById: true,
      choreographers: { where: { userId: user.id }, select: { userId: true } },
    },
    orderBy: { title: "asc" },
  });
  // The ones you lead first (an admin sees every choreography after them).
  const options = choreographies
    .map((choreography) => ({
      id: choreography.id,
      title: choreography.title,
      leads: choreography.createdById === user.id || choreography.choreographers.length > 0,
    }))
    .sort((left, right) => Number(right.leads) - Number(left.leads));

  return (
    <AppShell title={t("title")}>
      <ShareToResource
        choreographies={options.map(({ id, title }) => ({ id, title }))}
        maxBytes={MAX_RESOURCE_BYTES}
        storageReady={isS3Configured()}
        missed={params.missed === "1"}
      />
    </AppShell>
  );
}
