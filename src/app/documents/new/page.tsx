import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { newDocumentContent } from "./content";

export default async function NewDocumentPage() {
  const { title, form } = await newDocumentContent();
  return (
    <AppShell title={title}>
      <Card className="mx-auto max-w-xl">{form}</Card>
    </AppShell>
  );
}
