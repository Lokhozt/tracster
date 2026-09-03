import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { LoginForm } from "@/components/LoginForm";
import { Card } from "@/components/ui";

type LoginPageProps = {
  searchParams: Promise<{ email?: string; password?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [params, t] = await Promise.all([
    searchParams,
    getTranslations("Pages.Login"),
  ]);

  if (typeof params.password === "string") {
    const email =
      typeof params.email === "string" ? `?email=${encodeURIComponent(params.email)}` : "";
    redirect(`/login${email}`);
  }

  const defaultEmail = typeof params.email === "string" ? params.email : undefined;

  return (
    <AppShell title={t("title")}>
      <Card className="mx-auto max-w-md">
        <LoginForm defaultEmail={defaultEmail} />
      </Card>
    </AppShell>
  );
}
