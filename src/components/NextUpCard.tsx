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
  layout = "block",
  compactOnPhones = false,
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
  /** "strip": a single line on wide screens (xl+: Planning, event page). */
  layout?: "block" | "strip";
  /** Phones and tablets: one short row (time | title), so the planning's calendar shows sooner. */
  compactOnPhones?: boolean;
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
  // The day of the event (or while it runs): the block's one decorative moment, a spotlight
  // sweep on load.
  let isToday = false;
  if (now) {
    const minutesLeft = Math.round((start.getTime() - now.getTime()) / 60_000);
    if (start <= now && (!end || end > now)) {
      relative = t("rightNow");
      isToday = true;
    } else if (minutesLeft > 0 && minutesLeft < 60) {
      // Last hour: a live countdown ("Dans 42 minutes"), refreshed every minute.
      const formatted = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(minutesLeft, "minute");
      relative = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      isToday = true;
    } else {
      const days = Math.round((startOfLocalDay(start) - startOfLocalDay(now)) / DAY_MS);
      const formatted = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
      relative = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      isToday = days === 0;
    }
  }

  // "strip" (desktop only): one line — time, then label/title/details, then the pill — so the
  // block does not push the calendar down. Phones always get the stacked block.
  const strip = layout === "strip";
  const compact = compactOnPhones;
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "next-up-in relative isolate overflow-hidden rounded-2xl bg-stage p-5 text-[#fff] shadow-lg sm:p-6",
          isToday && "next-up-today",
          strip && "xl:flex xl:items-center xl:gap-8 xl:py-4",
          compact && "max-lg:flex max-lg:items-center max-lg:gap-4 max-lg:p-3 max-lg:px-4",
          // Compact with an answer (choreography): the answer takes its own row under the line.
          compact && Boolean(children) && "max-lg:flex-wrap max-lg:gap-y-3 xl:flex-wrap xl:gap-y-3",
        )}
      >
        {/* Seasonal illustration (autumn leaves, christmas snow), set by the frame's theme in CSS. */}
        <span aria-hidden="true" className="next-up-art" />
        <div className={cn("flex items-center justify-between gap-3", strip && "xl:hidden", compact && "max-lg:hidden")}>
          {href ? (
            <Link href={href} className={cn("text-sm font-semibold text-[#fff]/75", cardLink)}>
              {label}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-[#fff]/75">{label}</p>
          )}
          {relative && (
            <span className="rounded-full bg-spotlight px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-spotlight-ink">
              {relative}
            </span>
          )}
        </div>
        <div
          className={cn(
            "mt-3 flex items-end gap-3",
            strip && "xl:mt-0 xl:shrink-0",
            compact && "max-lg:mt-0 max-lg:shrink-0 max-lg:flex-col max-lg:items-start max-lg:gap-1",
          )}
        >
          <span
            className={cn(
              "font-display text-6xl leading-[0.85] tabular-nums",
              strip && "xl:text-5xl",
              compact && "max-lg:text-4xl",
            )}
            suppressHydrationWarning
          >
            {now ? time.format(start) : "\u00a0"}
          </span>
          <span
            className={cn("pb-1 font-display text-xl text-[#fff]/80", compact && "max-lg:pb-0 max-lg:text-sm")}
            suppressHydrationWarning
          >
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
        <div className={cn(strip && "xl:min-w-0 xl:flex-1", compact && "max-lg:min-w-0 max-lg:flex-1")}>
          {strip && (
            <div
              className={cn(
                "hidden xl:block",
                // Phones: label and "Dans 3 jours" share one line above the title.
                compact && "max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-2",
              )}
            >
              {href ? (
                <Link
                  href={href}
                  className={cn("text-sm font-semibold text-[#fff]/75", compact && "max-lg:truncate max-lg:text-xs", cardLink)}
                >
                  {label}
                </Link>
              ) : (
                <p className={cn("text-sm font-semibold text-[#fff]/75", compact && "max-lg:truncate max-lg:text-xs")}>
                  {label}
                </p>
              )}
              {compact && relative && (
                <span className="shrink-0 rounded-full bg-spotlight px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap text-spotlight-ink lg:hidden">
                  {relative}
                </span>
              )}
            </div>
          )}
          {title && (
            <p
              className={cn(
                "mt-3 text-lg font-semibold",
                strip && "xl:mt-0.5 xl:truncate",
                compact && "max-lg:mt-0.5 max-lg:truncate max-lg:text-base",
              )}
            >
              {title}
            </p>
          )}
          {(subtitle || location) && (
            <p
              className={cn(
                "text-sm text-[#fff]/70",
                !title && "mt-3",
                strip && "xl:mt-0 xl:truncate",
                compact && "max-lg:mt-0 max-lg:truncate max-lg:text-xs",
              )}
            >
              {[subtitle, location].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {strip && relative && (
          <span
            className={cn(
              "hidden shrink-0 self-start rounded-full bg-spotlight px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-spotlight-ink xl:inline-block",
            )}
          >
            {relative}
          </span>
        )}
        {children && (
          <div
            className={cn(
              "mt-4 rounded-xl bg-stone-50 p-3 text-stone-900",
              strip && "xl:mt-0 xl:shrink-0",
              compact && "max-lg:mt-0 max-lg:basis-full max-lg:p-2 xl:basis-full xl:p-2",
              aboveCardLink,
            )}
          >
            {children}
          </div>
        )}
      </div>
      {footer}
    </div>
  );
}
