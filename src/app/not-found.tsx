import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";

/** Any unknown page: in the app's look and language, with a way back. */
export default async function NotFound() {
  const t = await getTranslations("Pages.NotFound");
  return (
    <AppShell title={t("title")}>
      <p className="mb-6 max-w-prose text-stone-600">{t("body")}</p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-700"
      >
        {t("backToPlanning")}
      </Link>
    </AppShell>
  );
}
