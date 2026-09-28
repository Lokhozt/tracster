"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import type { LinkEmbed } from "@/lib/resource-media";

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
  const [copied, setCopied] = useState(false);
  const label =
    title ||
    (embed?.provider === "youtube"
      ? t("youtubeVideo")
      : embed?.provider === "spotify"
        ? t("spotifyPlayer")
        : embed?.provider === "google"
          ? t("googleDocument")
          : url);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const actions = (
    <div className="mb-3 flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={copyLink}>
        {copied ? t("linkCopied") : t("copyLink")}
      </Button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
      >
        {t("openLink")}
      </a>
    </div>
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

  return (
    <div>
      {actions}
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
