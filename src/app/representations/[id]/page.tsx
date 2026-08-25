import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EditRepresentationForm, RepresentationChoreographiesSection } from "@/components/RepresentationForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import {
  canEditRepresentation,
  canViewRepresentation,
} from "@/lib/representations";

type PageProps = { params: Promise<{ id: string }> };

export default async function RepresentationDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  if (!(await canViewRepresentation(id, user.id))) {
    notFound();
  }

  const representation = await prisma.representation.findUnique({
    where: { id },
    include: {
      choreographies: {
        include: { choreography: { select: { id: true, title: true } } },
        orderBy: { choreography: { title: "asc" } },
      },
    },
  });

  if (!representation) {
    notFound();
  }

  const canEdit = await canEditRepresentation(id, user.id);

  const serialized = {
    id: representation.id,
    title: representation.title,
    startsAt: representation.startsAt.toISOString(),
    endsAt: representation.endsAt?.toISOString() ?? null,
    location: representation.location,
    notes: representation.notes,
  };

  return (
    <AppShell title={representation.title ?? "Representation"}>
      <div className="mb-6">
        <Link href="/representations" className="text-sm text-stone-600 hover:text-stone-900">
          ← Back to representations
        </Link>
      </div>

      {canEdit ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Edit representation</h2>
          <EditRepresentationForm representation={serialized} />
        </Card>
      ) : (
        <Card className="mb-6">
          <div className="grid gap-2 text-sm text-stone-600">
            <p>
              <span className="font-medium text-stone-900">Start:</span>{" "}
              {formatDateTime(representation.startsAt)}
            </p>
            {representation.endsAt && (
              <p>
                <span className="font-medium text-stone-900">End:</span>{" "}
                {formatDateTime(representation.endsAt)}
              </p>
            )}
            {representation.location && (
              <p>
                <span className="font-medium text-stone-900">Location:</span>{" "}
                {representation.location}
              </p>
            )}
            {representation.notes && (
              <p>
                <span className="font-medium text-stone-900">Notes:</span>{" "}
                {representation.notes}
              </p>
            )}
          </div>
        </Card>
      )}

      <Card>
        <RepresentationChoreographiesSection
          representationId={id}
          canEdit={canEdit}
          choreographies={representation.choreographies.map((link) => ({
            id: link.choreography.id,
            title: link.choreography.title,
          }))}
        />
      </Card>
    </AppShell>
  );
}
