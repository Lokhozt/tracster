"use client";

import { useTranslations } from "next-intl";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import type { LinkEmbed } from "@/lib/resource-media";

export function PdfViewer({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      className="h-[calc(100vh-12rem)] min-h-[32rem] w-full rounded-lg border border-stone-200 bg-white"
      src={src}
      title={title}
    />
  );
}

export function ResourceLink({
  url,
  embed,
  title,
}: {
  url: string;
  embed: LinkEmbed | null;
  title?: string | null;
}) {
  const t = useTranslations("Components");
  const label =
    title ||
    (embed?.provider === "youtube"
      ? t("youtubeVideo")
      : embed?.provider === "spotify"
        ? t("spotifyPlayer")
        : embed?.provider === "google"
          ? t("googleDocument")
          : url);

  // Plain links are real <a> elements: tap opens, long press copies/shares, so no extra buttons.
  // Embedded players (YouTube, Spotify, Google) swallow the long press, so they get a small link.
  const actions = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-2 inline-flex text-sm font-medium text-stone-600 hover:text-stone-900"
    >
      {t("openResourceLink")} ↗
    </a>
  );

  if (embed?.provider === "youtube") {
    return (
      <div>
        {actions}
        <div className="aspect-video overflow-hidden rounded-lg">
          <iframe
            className="h-full w-full"
            src={embed.src}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (embed?.provider === "spotify") {
    return (
      <div>
        {actions}
        <iframe
          className="w-full rounded-lg"
          style={{ height: embed.height }}
          src={embed.src}
          title={label}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    );
  }

  if (embed?.provider === "google") {
    return (
      <div>
        {actions}
        <iframe
          className="h-[32rem] w-full rounded-lg border border-stone-200 bg-white"
          src={embed.src}
          title={label}
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (embed?.provider === "whatsapp") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <WhatsAppLink href={url} label={t("openWhatsapp")} />
      </div>
    );
  }

  return (
    <div>
      <a
        className="break-all font-medium text-stone-800 underline hover:text-stone-600"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {url}
      </a>
    </div>
  );
}
