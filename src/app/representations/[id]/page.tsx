import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { AppShell } from "@/components/AppShell";
import { EditRepresentationForm, RepresentationChoreographiesSection } from "@/components/RepresentationForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatTime } from "@/lib/datetime";
import {
  canEditRepresentation,
  canViewRepresentation,
} from "@/lib/representations";
import { displayLocation, listedLocationInclude } from "@/lib/locations";

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
      ...listedLocationInclude,
      choreographies: {
          where: { choreography: { archivedAt: null } },
          include: {
          choreography: {
            select: {
              id: true,
              title: true,
              description: true,
              _count: { select: { members: true, repetitions: true } },
            },
          },
        },
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
    location: displayLocation(representation),
    locationId: representation.locationId,
    notes: representation.notes,
  };

  return (
    <AppShell>
      <div className="mb-6">
        <Link href="/representations" className="text-sm text-stone-600 hover:text-stone-900">
          ← Back to representations
        </Link>
      </div>

      <div className="mb-8 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-amber-200 bg-amber-100 px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
            Representation
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">
            {representation.title ?? "Representation"}
          </h1>
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Date</p>
            <p className="mt-1 text-sm font-medium text-stone-900">
              {format(representation.startsAt, "EEEE d MMMM yyyy")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Time</p>
            <p className="mt-1 text-sm font-medium text-stone-900">
              {formatTime(representation.startsAt)}
              {representation.endsAt ? ` – ${formatTime(representation.endsAt)}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Location</p>
            <p className="mt-1 text-sm font-medium text-stone-900">
              {displayLocation(representation) || "—"}
            </p>
          </div>
        </div>
        {representation.notes && (
          <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Notes</p>
            <p className="mt-1 text-sm text-stone-700">{representation.notes}</p>
          </div>
        )}
      </div>

      {canEdit && (
        <Card className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Edit representation</h2>
          <EditRepresentationForm representation={serialized} />
        </Card>
      )}

      <RepresentationChoreographiesSection
        representationId={id}
        canEdit={canEdit}
        choreographies={representation.choreographies.map((link) => ({
          id: link.choreography.id,
          title: link.choreography.title,
          description: link.choreography.description,
          memberCount: link.choreography._count.members,
          repetitionCount: link.choreography._count.repetitions,
        }))}
      />
    </AppShell>
  );
}
