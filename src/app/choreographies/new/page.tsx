import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateChoreographyForm } from "@/components/CreateChoreographyForm";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { canCreateChoreography } from "@/lib/site-settings";

export default async function NewChoreographyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!(await canCreateChoreography(user.id))) {
    redirect("/choreographies");
  }

  return (
    <AppShell title="New choreography">
      <Card>
        <CreateChoreographyForm />
      </Card>
    </AppShell>
  );
}
