
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function FollowAssociationCalendarLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const t = useTranslations("Components");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100",
        className,
      )}
    >
      <GoogleCalendarMark />
      {t("followAssociationCalendar")}
    </a>
  );
}

function GoogleCalendarMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path fill="#188038" d="M6 3h12a3 3 0 0 1 3 3v1H3V6a3 3 0 0 1 3-3Z" />
      <path fill="#1967d2" d="M3 7h18v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7Z" />
      <path fill="#fff" d="M8.2 17.2V10h1.7l2.4 3.9h.1V10h1.6v7.2h-1.7l-2.4-3.9h-.1v3.9H8.2Z" />
    </svg>
  );
}
