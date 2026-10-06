import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { LegalDocument } from "@/components/LegalDocument";
import { getAppName } from "@/lib/app-name";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Legal.privacy");
  return { title: `${t("title")} · ${getAppName()}` };
}

export default async function PrivacyPage() {
  const t = await getTranslations("Legal.privacy");

  return (
    <AppShell title={t("title")}>
      <LegalDocument page="privacy" />
    </AppShell>
  );
}
