"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SerializedChoreographyResource } from "@/lib/choreography-resources";
import type { LinkEmbed } from "@/lib/resource-media";
import { useResourceFileUrl } from "@/lib/use-resource-file-url";
import { cn } from "@/lib/utils";

/** Pieces shared by the video gallery (feed, desktop player) and the app-wide phone player. */

export type GalleryVideo = {
  choreography: { id: string; title: string };
  resource: SerializedChoreographyResource;
};

/** The open video lives in the URL, so the back button closes it and the link can be shared. */
export const VIDEO_PARAM = "video";
export function urlWithVideo(videoId: string | null): string {
  const url = new URL(window.location.href);
  if (videoId) {
    url.searchParams.set(VIDEO_PARAM, videoId);
  } else {
    url.searchParams.delete(VIDEO_PARAM);
  }
  return url.pathname + url.search + url.hash;
}

export function useVideoTitle() {
  const t = useTranslations("Components");
  return (resource: SerializedChoreographyResource) =>
    resource.description || resource.fileName || t("youtubeVideo");
}

export function AddedOn({ createdAt }: { createdAt: string }) {
  const locale = useLocale();
  return (
    // Day only, in the viewer's timezone: may differ from the server render around midnight.
    <time dateTime={createdAt} suppressHydrationWarning>
      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(createdAt))}
    </time>
  );
}

export function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.52.85l10.4-6.5a1 1 0 0 0 0-1.7L9.52 4.65A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function VideoThumbnail({
  resource,
  choreographyId,
  className,
}: {
  resource: SerializedChoreographyResource;
  choreographyId: string;
  className?: string;
}) {
  const youtube = resource.embed?.provider === "youtube" ? resource.embed : null;
  const uploaded = resource.type === "FILE" && resource.mediaKind === "video";
  return (
    <span
      className={cn(
        // A fixed dark tile (not the palette's stone, which the dark theme turns light).
        "relative flex aspect-video shrink-0 items-center justify-center overflow-hidden bg-[#1c1622] text-white/85",
        className,
      )}
    >
      {youtube ? (
        // A YouTube still: Next's image optimizer is not configured for remote hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={youtube.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <>
          {uploaded && <UploadedVideoFrame choreographyId={choreographyId} resourceId={resource.id} />}
          <span className="relative flex size-11 items-center justify-center rounded-full bg-black/45">
            <PlayIcon className="size-6" />
          </span>
        </>
      )}
    </span>
  );
}

/**
 * The browser's own still of an uploaded video, as a gallery shows: a muted video that never
 * plays, asked for the frame at 1 s (Safari only shows one when given a time), loading just
 * enough of the file for it. Only once the tile nears the screen; nothing is stored.
 */
function UploadedVideoFrame({ choreographyId, resourceId }: { choreographyId: string; resourceId: string }) {
  const t = useTranslations("Components");
  const holderRef = useRef<HTMLSpanElement>(null);
  const [nearScreen, setNearScreen] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const { url } = useResourceFileUrl(choreographyId, resourceId, {
    enabled: nearScreen,
    fallbackError: t("resourceLoadError"),
  });

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearScreen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(holder);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={holderRef} aria-hidden="true" className="absolute inset-0">
      {url && (
        <video
          src={`${url}#t=1`}
          muted
          playsInline
          preload="metadata"
          disablePictureInPicture
          tabIndex={-1}
          onLoadedData={() => setFrameReady(true)}
          className={cn(
            "pointer-events-none h-full w-full object-cover transition-opacity duration-(--duration-medium)",
            frameReady ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </span>
  );
}

/**
 * Where the player sits: in the page (desktops), the phone watch sheet (a phone turned sideways
 * gets it on the whole screen) or the mini player. Only its classes change between the last two,
 * so shrinking or opening the sheet never restarts the video.
 */
export type VideoPlayerVariant = "inline" | "sheet" | "mini";

const PLAYER_FRAME: Record<VideoPlayerVariant, string> = {
  inline: "aspect-video w-full rounded-xl",
  sheet: "aspect-video w-full phone-landscape:aspect-auto phone-landscape:h-full",
  mini: "h-full w-full",
};

const YOUTUBE_PLAYING = 1;

function isYouTubeOrigin(origin: string) {
  return /^https:\/\/(www\.)?youtube(-nocookie)?\.com$/.test(origin);
}

/**
 * A YouTube video. In the phone sheet, a see-through layer covers its top two thirds: it takes
 * swipes (which a YouTube frame keeps for itself) so the sheet can shrink, and turns taps into
 * play / pause through YouTube's player messages. YouTube's own controls stay on the bottom third.
 */
function YouTubePlayer({
  embed,
  title,
  autoPlay,
  frame,
  catchTouches,
}: {
  embed: Extract<LinkEmbed, { provider: "youtube" }>;
  title: string;
  autoPlay: boolean;
  frame: string;
  catchTouches: boolean;
}) {
  const t = useTranslations("Components");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Starts as asked; then follows what the player reports.
  const playingRef = useRef(autoPlay);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow || !isYouTubeOrigin(event.origin)) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const state = data?.info?.playerState;
        if (typeof state === "number") playingRef.current = state === YOUTUBE_PLAYING;
      } catch {
        // Not a player message.
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function send(message: object) {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), "*");
  }

  function togglePlayback() {
    send({ event: "command", func: playingRef.current ? "pauseVideo" : "playVideo", args: [] });
    playingRef.current = !playingRef.current;
  }

  // The same address in every place the player goes: a changed one would reload the video.
  const src = `${embed.src}?enablejsapi=1&playsinline=1${autoPlay ? "&autoplay=1" : ""}`;
  return (
    <div className={cn(frame, "relative overflow-hidden")}>
      <iframe
        ref={iframeRef}
        className="h-full w-full"
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        // Ask the player to report its state (playing, paused…), as YouTube's own script does.
        onLoad={() => send({ event: "listening", id: embed.src, channel: "widget" })}
      />
      {catchTouches && (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={t("playPauseVideo")}
          className="absolute inset-x-0 top-0 h-2/3 phone-landscape:hidden"
        />
      )}
    </div>
  );
}

export function VideoPlayer({
  video,
  autoPlay,
  variant,
}: {
  video: GalleryVideo;
  autoPlay: boolean;
  variant: VideoPlayerVariant;
}) {
  const t = useTranslations("Components");
  const title = useVideoTitle();
  const frame = cn("bg-black", PLAYER_FRAME[variant]);
  const { embed } = video.resource;
  const { url, error } = useResourceFileUrl(video.choreography.id, video.resource.id, {
    enabled: embed?.provider !== "youtube",
    fallbackError: t("resourceLoadError"),
  });

  if (embed?.provider === "youtube") {
    return (
      <YouTubePlayer
        embed={embed}
        title={title(video.resource)}
        autoPlay={autoPlay}
        frame={frame}
        catchTouches={variant === "sheet"}
      />
    );
  }
  if (!url) {
    return (
      <div className={cn(frame, "flex items-center justify-center px-4 text-center text-sm text-white/70")}>
        {error ?? t("loading")}
      </div>
    );
  }
  return (
    <video
      className={cn(frame, "object-contain")}
      controls
      playsInline
      autoPlay={autoPlay}
      preload="metadata"
      src={url}
    />
  );
}

/** How a gallery presents its videos; the phone player keeps it with the open video. */
export type VideoListOptions = {
  showChoreography: boolean;
  renderActions?: (video: GalleryVideo) => ReactNode;
};

export type WatchProps = VideoListOptions & {
  video: GalleryVideo;
  upNext: GalleryVideo[];
  onSelect: (video: GalleryVideo) => void;
};

export function WatchDetails({
  video,
  showChoreography,
  renderActions,
}: Pick<WatchProps, "video" | "showChoreography" | "renderActions">) {
  const t = useTranslations("Components");
  const title = useVideoTitle();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-lg font-semibold break-words text-stone-900">
          {title(video.resource)}
        </h3>
        {showChoreography && (
          <Link
            href={`/choreographies/${video.choreography.id}?section=resources`}
            className="mt-1 block truncate text-sm font-medium text-stone-700 hover:text-stone-900"
          >
            {video.choreography.title}
          </Link>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-stone-500">
          <AddedOn createdAt={video.resource.createdAt} />
          {video.resource.type === "LINK" && video.resource.url && (
            <>
              <span aria-hidden="true">·</span>
              <a
                href={video.resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-stone-600 hover:text-stone-900"
              >
                {t("openOnYoutube")} ↗
              </a>
            </>
          )}
        </p>
      </div>
      {renderActions && <div className="shrink-0">{renderActions(video)}</div>}
    </div>
  );
}

export function UpNextList({
  upNext,
  showChoreography,
  onSelect,
}: Pick<WatchProps, "upNext" | "showChoreography" | "onSelect">) {
  const t = useTranslations("Components");
  const title = useVideoTitle();
  if (upNext.length === 0) return null;
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-semibold text-stone-500">{t("upNextVideos")}</h3>
      <ul className="space-y-1">
        {upNext.map((video) => (
          <li key={video.resource.id}>
            <button
              type="button"
              onClick={() => onSelect(video)}
              className="flex w-full items-start gap-3 rounded-lg p-1.5 text-left transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:outline-none"
            >
              <VideoThumbnail resource={video.resource} choreographyId={video.choreography.id} className="w-40 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium break-words text-stone-900">
                  {title(video.resource)}
                </span>
                {showChoreography && (
                  <span className="mt-1 block truncate text-xs text-stone-600">
                    {video.choreography.title}
                  </span>
                )}
                <span className="mt-0.5 block text-xs text-stone-500">
                  <AddedOn createdAt={video.resource.createdAt} />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
