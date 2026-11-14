import { RouteSheet } from "@/components/RouteSheet";
import { newChoreographyContent } from "@/app/choreographies/new/content";

/** In-app navigation to this create route: the form in a sheet over the current page. */
export default async function NewChoreographySheet() {
  const { title, form } = await newChoreographyContent();
  return <RouteSheet title={title}>{form}</RouteSheet>;
}
