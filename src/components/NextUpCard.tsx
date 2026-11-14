"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { aboveCardLink, cardLink, cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * The one bold element of a page ("call sheet" design): when it happens, on the stage colour,
 * with the time large and condensed. With `href` the whole block opens the event (Planning,
 * choreography); without, it is the event page's own header. `children` (e.g. availability
 * buttons) sit on a light panel and stay clickable.
 */
export function NextUpCard({
  label,
  href,
  startsAt,
  endsAt,
  showEnd = false,
  title,
  subtitle,
  location,
  children,
  footer,
}: {
  label: string;
  href?: string;
  startsAt: string;
  endsAt?: string | null;
  /** Shows "→ end" next to the day (the event page). */
  showEnd?: boolean;
  title?: string;
  subtitle?: string | null;
  location?: string | null;
  children?: React.ReactNode;
  /** A secondary line under the block (e.g. the next performance). */
  footer?: React.ReactNode;
}) {
  const t = useTranslations("Components");
  const locale = useLocale();
  // Times and "in 2 days" depend on the viewer's clock and timezone: computed after mount.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });

  let relative: string | null = null;
  if (now) {
    if (start <= now && (!end || end > now)) {
      relative = t("rightNow");
    } else {
      const days = Math.round((startOfLocalDay(start) - startOfLocalDay(now)) / DAY_MS);
      const formatted = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
      relative = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
  }

  return (
    <div className="space-y-2">
      <div className="next-up-in relative overflow-hidden rounded-2xl bg-stage p-5 text-[#fff] shadow-lg sm:p-6">
        <div className="flex items-center justify-between gap-3">
          {href ? (
            <Link href={href} className={cn("text-sm font-semibold text-[#fff]/75", cardLink)}>
              {label}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-[#fff]/75">{label}</p>
          )}
          {relative && (
            <span className="rounded-full bg-spotlight px-2.5 py-0.5 text-xs font-semibold text-spotlight-ink">
              {relative}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-end gap-3">
          <span className="font-display text-6xl leading-[0.85] tabular-nums" suppressHydrationWarning>
            {now ? time.format(start) : " "}
          </span>
          <span className="pb-1 font-display text-xl text-[#fff]/80" suppressHydrationWarning>
            {now ? day.format(start) : ""}
            {now && showEnd && end && (
              <span className="block text-base text-[#fff]/65">
                →{" "}
                {end.getTime() - start.getTime() < DAY_MS
                  ? time.format(end)
                  : `${day.format(end)} ${time.format(end)}`}
              </span>
            )}
          </span>
        </div>
        {title && <p className="mt-3 text-lg font-semibold">{title}</p>}
        {(subtitle || location) && (
          <p className={cn("text-sm text-[#fff]/70", !title && "mt-3")}>{[subtitle, location].filter(Boolean).join(" · ")}</p>
        )}
        {children && (
          <div className={cn("mt-4 rounded-xl bg-stone-50 p-3 text-stone-900", aboveCardLink)}>{children}</div>
        )}
      </div>
      {footer}
    </div>
  );
}
