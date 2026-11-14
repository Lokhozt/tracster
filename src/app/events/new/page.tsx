import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { newEventContent, type NewEventSearchParams } from "./content";

type PageProps = { searchParams: Promise<NewEventSearchParams> };

export default async function NewEventPage({ searchParams }: PageProps) {
  const { title, form } = await newEventContent(searchParams);
  return (
    <AppShell title={title}>
      <Card className="mx-auto max-w-xl">{form}</Card>
    </AppShell>
  );
}
