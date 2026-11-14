import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";

/**
 * A choreography that does not exist, is archived, or is hidden from non-participants: say so
 * plainly (members mostly land here from an old link to a piece they are not part of).
 */
export default async function ChoreographyNotFound() {
  const t = await getTranslations("Pages.NotFound");
  return (
    <AppShell title={t("choreographyTitle")}>
      <p className="mb-6 max-w-prose text-stone-600">{t("choreographyBody")}</p>
      <Link
        href="/choreographies"
        className="inline-flex min-h-11 items-center rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-700"
      >
        {t("backToChoreographies")}
      </Link>
    </AppShell>
  );
}
