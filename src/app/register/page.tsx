import { AppShell } from "@/components/AppShell";
import { RegisterForm } from "@/components/RegisterForm";
import { Card } from "@/components/ui";

export default function RegisterPage() {
  return (
    <AppShell title="Create account">
      <Card className="mx-auto max-w-md">
        <RegisterForm />
      </Card>
    </AppShell>
  );
}
