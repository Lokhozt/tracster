import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAppName } from "@/lib/app-name";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{getAppName()}</p>
        <nav aria-label={t("navLabel")} className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/privacy" className="hover:text-stone-900">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-stone-900">
            {t("terms")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
