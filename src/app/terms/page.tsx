import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { LegalDocument } from "@/components/LegalDocument";
import { getAppName } from "@/lib/app-name";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal.terms");
  return { title: `${t("title")} · ${getAppName()}` };
}

export default async function TermsPage() {
  const t = await getTranslations("Legal.terms");

  return (
    <AppShell title={t("title")}>
      <LegalDocument page="terms" />
    </AppShell>
  );
}
