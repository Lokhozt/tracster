import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RepresentationsList } from "@/components/RepresentationsList";
import { getCurrentUser } from "@/lib/auth";
import { hasGlobalAccess } from "@/lib/roles";
import {
  canEditRepresentation,
  getUserRepresentations,
  serializeRepresentation,
} from "@/lib/representations";

export default async function RepresentationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const representations = await getUserRepresentations(user.id);
  const globalAccess = await hasGlobalAccess(user.id);

  const representationItems = await Promise.all(
    representations.map(async (representation) => ({
      representation: serializeRepresentation(representation),
      canEdit: await canEditRepresentation(representation.id, user.id),
    })),
  );

  return (
    <AppShell title="Representations">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-stone-600">
          {globalAccess
            ? "All representations in the association."
            : "Performances and shows linked to your choreographies."}
        </p>
        <Link
          href="/representations/new"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          New representation
        </Link>
      </div>

      {representationItems.length === 0 ? (
        <p className="text-stone-600">No representations yet. Create your first one.</p>
      ) : (
        <RepresentationsList items={representationItems} />
      )}
    </AppShell>
  );
}
