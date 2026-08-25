import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateRepresentationForm } from "@/components/RepresentationForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditChoreography } from "@/lib/permissions";

export default async function NewRepresentationPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const choreographies = await prisma.choreography.findMany({
    where: {
      archivedAt: null,
      OR: [
        { createdById: user.id },
        { choreographers: { some: { userId: user.id } } },
      ],
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const editableChoreographies = (
    await Promise.all(
      choreographies.map(async (choreography) =>
        (await canEditChoreography(choreography.id, user.id)) ? choreography : null,
      ),
    )
  ).filter((choreography) => choreography !== null);

  return (
    <AppShell title="New representation">
      <Card className="max-w-xl">
        <CreateRepresentationForm
          choreographyOptions={editableChoreographies}
          redirectBasePath="/representations"
        />
      </Card>
    </AppShell>
  );
}
