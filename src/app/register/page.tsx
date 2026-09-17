import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { RegisterForm } from "@/components/RegisterForm";
import { Card } from "@/components/ui";
import { isRegistrationPasswordRequired } from "@/lib/registering-password";

export default async function RegisterPage() {
  await connection();
  const t = await getTranslations("Pages.Register");

  return (
    <AppShell title={t("title")}>
      <Card className="mx-auto max-w-md">
        <RegisterForm requiresRegistrationPassword={isRegistrationPasswordRequired()} />
      </Card>
    </AppShell>
  );
}
