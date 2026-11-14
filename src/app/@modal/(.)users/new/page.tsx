import { RouteSheet } from "@/components/RouteSheet";
import { newUserContent } from "@/app/users/new/content";

/** In-app navigation to this create route: the form in a sheet over the current page. */
export default async function NewUserSheet() {
  const { title, form } = await newUserContent();
  return <RouteSheet title={title}>{form}</RouteSheet>;
}
