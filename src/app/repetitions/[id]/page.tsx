import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function RepetitionRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/events/${id}`);
}
