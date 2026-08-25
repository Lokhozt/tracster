import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LoginForm } from "@/components/LoginForm";
import { Card } from "@/components/ui";

type LoginPageProps = {
  searchParams: Promise<{ email?: string; password?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  if (typeof params.password === "string") {
    const email =
      typeof params.email === "string" ? `?email=${encodeURIComponent(params.email)}` : "";
    redirect(`/login${email}`);
  }

  const defaultEmail = typeof params.email === "string" ? params.email : undefined;

  return (
    <AppShell title="Sign in">
      <Card className="mx-auto max-w-md">
        <LoginForm defaultEmail={defaultEmail} />
      </Card>
    </AppShell>
  );
}
