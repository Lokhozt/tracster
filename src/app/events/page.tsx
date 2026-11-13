import { redirect } from "next/navigation";

/** The events list was merged into the planning (search, filters and past events live there). */
export default function EventsPage() {
  redirect("/");
}
