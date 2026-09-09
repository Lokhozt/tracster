import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/password-reset";

type PageProps = { params: Promise<{ token: string }> };

export default async function ResetPasswordPage({ params }: PageProps) {
  const { token } = await params;
  const t = await getTranslations("Pages.ResetPassword");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(token) },
    select: { expiresAt: true },
  });
  const valid = Boolean(record && record.expiresAt > new Date());

  return (
    <AppShell title={t("title")}>
      <Card className="mx-auto max-w-md">
        {valid ? (
          <>
            <p className="mb-4 text-sm text-stone-600">{t("help")}</p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">{t("invalid")}</p>
            <Link href="/login" className="text-sm font-medium text-stone-900 hover:underline">
              {t("backToSignIn")}
            </Link>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
