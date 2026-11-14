import { RouteSheet } from "@/components/RouteSheet";
import { newEventContent, type NewEventSearchParams } from "@/app/events/new/content";

type PageProps = { searchParams: Promise<NewEventSearchParams> };

/** In-app navigation to this create route: the form in a sheet over the current page. */
export default async function NewEventSheet({ searchParams }: PageProps) {
  const { title, form } = await newEventContent(searchParams);
  return <RouteSheet title={title}>{form}</RouteSheet>;
}
