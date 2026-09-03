import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { RegisterForm } from "@/components/RegisterForm";
import { Card } from "@/components/ui";

export default async function RegisterPage() {
  const t = await getTranslations("Pages.Register");

  return (
    <AppShell title={t("title")}>
      <Card className="mx-auto max-w-md">
        <RegisterForm />
      </Card>
    </AppShell>
  );
}
