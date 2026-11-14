import { RouteSheet } from "@/components/RouteSheet";
import { newDocumentContent } from "@/app/documents/new/content";

/** In-app navigation to this create route: the form in a sheet over the current page. */
export default async function NewDocumentSheet() {
  const { title, form } = await newDocumentContent();
  return <RouteSheet title={title}>{form}</RouteSheet>;
}
