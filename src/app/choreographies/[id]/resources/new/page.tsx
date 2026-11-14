import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { newChoreographyResourceContent } from "./content";

type PageProps = { params: Promise<{ id: string }> };

export default async function NewChoreographyResourcePage({ params }: PageProps) {
  const { title, form } = await newChoreographyResourceContent((await params).id);
  return (
    <AppShell title={title}>
      <Card className="mx-auto max-w-xl">{form}</Card>
    </AppShell>
  );
}
