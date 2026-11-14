import { RouteSheet } from "@/components/RouteSheet";
import { newChoreographyResourceContent } from "@/app/choreographies/[id]/resources/new/content";

type PageProps = { params: Promise<{ id: string }> };

/** In-app navigation to this create route: the form in a sheet over the current page. */
export default async function NewChoreographyResourceSheet({ params }: PageProps) {
  const { title, form } = await newChoreographyResourceContent((await params).id);
  return <RouteSheet title={title}>{form}</RouteSheet>;
}
