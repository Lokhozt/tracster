import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateEventForm } from "@/components/EventForms";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { basicUserSelect, serializeBasicUser } from "@/lib/users";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: basicUserSelect,
  });

  return (
    <AppShell title="New event">
      <Card className="max-w-xl">
        <CreateEventForm
          participantOptions={users.map(serializeBasicUser)}
          redirectBasePath="/events"
        />
      </Card>
    </AppShell>
  );
}
