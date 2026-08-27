import { redirect } from "next/navigation";

export default function NewRepresentationRedirectPage() {
  redirect("/events/new?type=representation");
}
