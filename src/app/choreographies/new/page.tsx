import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateChoreographyForm } from "@/components/CreateChoreographyForm";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export default async function NewChoreographyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell title="New choreography">
      <Card>
        <CreateChoreographyForm />
      </Card>
    </AppShell>
  );
}
