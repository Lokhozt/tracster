import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { newChoreographyContent } from "./content";

export default async function NewChoreographyPage() {
  const { title, form } = await newChoreographyContent();
  return (
    <AppShell title={title}>
      <Card className="mx-auto max-w-xl">{form}</Card>
    </AppShell>
  );
}
