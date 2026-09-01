import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ googleCalendar?: string }>;
};

export default async function CalendarSyncRedirectPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.googleCalendar) {
    params.set("googleCalendar", query.googleCalendar);
  }
  const suffix = params.size > 0 ? `?${params}` : "";
  redirect(`/account${suffix}`);
}
