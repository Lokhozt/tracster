import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { newUserContent } from "./content";

export default async function NewUserPage() {
  const { title, form } = await newUserContent();
  return (
    <AppShell title={title}>
      <Card className="mx-auto max-w-xl">{form}</Card>
    </AppShell>
  );
}
