"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  AddedOn,
  UpNextList,
  urlWithVideo,
  useVideoTitle,
  VIDEO_PARAM,
  VideoPlayer,
  VideoThumbnail,
  WatchDetails,
  type GalleryVideo,
  type WatchProps,
} from "@/components/VideoParts";
import { useVideoPlayer } from "@/components/VideoPlayerProvider";
import { Label, Select } from "@/components/ui";
import { useUrlFilter } from "@/lib/use-url-filter";

export type { GalleryVideo } from "@/components/VideoParts";

const LARGE_SCREEN_QUERY = "(min-width: 1024px)";

function subscribeToLargeScreen(onChange: () => void) {
  const query = window.matchMedia(LARGE_SCREEN_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** `null` on the server and while hydrating: the player waits until the screen is known. */
function useIsLargeScreen(): boolean | null {
  return useSyncExternalStore(
    subscribeToLargeScreen,
    () => window.matchMedia(LARGE_SCREEN_QUERY).matches,
    () => null,
  );
}

/** Desktops: the video takes the feed's place, the next videos beside it. */
function InlineWatch({
  autoPlay,
  onClose,
  ...watch
}: WatchProps & { autoPlay: boolean; onClose: () => void }) {
  const t = useTranslations("Components");
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
      >
        <span aria-hidden="true">←</span>
        {t("allVideos")}
      </button>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          <VideoPlayer key={watch.video.resource.id} video={watch.video} autoPlay={autoPlay} variant="inline" />
          <WatchDetails video={watch.video} showChoreography={watch.showChoreography} renderActions={watch.renderActions} />
        </div>
        <UpNextList upNext={watch.upNext} showChoreography={watch.showChoreography} onSelect={watch.onSelect} />
      </div>
    </div>
  );
}

function VideoFeed({
  videos,
  showChoreography,
  onOpen,
}: {
  videos: GalleryVideo[];
  showChoreography: boolean;
  onOpen: (video: GalleryVideo) => void;
}) {
  const title = useVideoTitle();
  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => (
        <li key={video.resource.id} className="min-w-0">
          <button
            type="button"
            onClick={() => onOpen(video)}
            className="group block w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-4 focus-visible:outline-none"
          >
            <VideoThumbnail
              resource={video.resource}
              choreographyId={video.choreography.id}
              className="w-full rounded-xl transition group-hover:opacity-90"
            />
            <span className="mt-2 line-clamp-2 font-medium break-words text-stone-900">
              {title(video.resource)}
            </span>
            <span className="mt-0.5 block truncate text-sm text-stone-500">
              {showChoreography && `${video.choreography.title} · `}
              <AddedOn createdAt={video.resource.createdAt} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Videos laid out like a video site: a feed of large thumbnails. A tap opens the video: in place
 * of the feed on desktops; on phones in the app-wide player (VideoPlayerProvider), which a swipe
 * down shrinks into a mini player.
 */
export function VideoGallery({
  videos,
  showChoreography = false,
  renderActions,
}: {
  videos: GalleryVideo[];
  /** Several choreographies at once ("My videos"): name each video's choreography. */
  showChoreography?: boolean;
  /** Management buttons (pin, edit…) for the open video. */
  renderActions?: (video: GalleryVideo) => ReactNode;
}) {
  const searchParams = useSearchParams();
  const isLargeScreen = useIsLargeScreen();
  const phonePlayer = useVideoPlayer();
  const rootRef = useRef<HTMLDivElement>(null);
  // Desktops: opened from this page (not a shared link), so closing goes back a step.
  const openedHere = useRef(false);
  // Only a video the user picks starts on its own, never one opened from a link.
  const [autoPlay, setAutoPlay] = useState(false);

  const openId = searchParams.get(VIDEO_PARAM);
  const open = videos.find((video) => video.resource.id === openId) ?? null;

  useEffect(() => {
    if (!open) openedHere.current = false;
  }, [open]);

  // Phones: a link naming a video opens it in the phone player.
  useEffect(() => {
    if (isLargeScreen === false && open) {
      phonePlayer.showFromUrl(open, videos, { showChoreography, renderActions });
    }
  }, [isLargeScreen, open, phonePlayer, renderActions, showChoreography, videos]);

  function openVideo(video: GalleryVideo) {
    if (!isLargeScreen) {
      phonePlayer.open(video, videos, { showChoreography, renderActions });
      return;
    }
    setAutoPlay(true);
    openedHere.current = true;
    window.history.pushState(null, "", urlWithVideo(video.resource.id));
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // The next video replaces the open one, so "back" still returns to the feed.
  function switchVideo(video: GalleryVideo) {
    setAutoPlay(true);
    window.history.replaceState(null, "", urlWithVideo(video.resource.id));
  }

  function close() {
    if (openedHere.current) {
      openedHere.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", urlWithVideo(null));
    }
  }

  return (
    <div ref={rootRef} className="scroll-mt-24">
      {open && isLargeScreen ? (
        <InlineWatch
          video={open}
          upNext={videos.filter((video) => video !== open)}
          autoPlay={autoPlay}
          showChoreography={showChoreography}
          renderActions={renderActions}
          onSelect={switchVideo}
          onClose={close}
        />
      ) : (
        <VideoFeed videos={videos} showChoreography={showChoreography} onOpen={openVideo} />
      )}
    </div>
  );
}

/** "My videos": every pinned video of the user's choreographies, filterable by choreography. */
export function MyVideos({ videos }: { videos: GalleryVideo[] }) {
  const t = useTranslations("Components");
  // In the address, like the other list filters: coming back from a choreography keeps it.
  const [choreographyId, setChoreographyId] = useUrlFilter("choreography", "");
  const choreographies = [
    ...new Map(videos.map((video) => [video.choreography.id, video.choreography])).values(),
  ].sort((left, right) => left.title.localeCompare(right.title));
  const selected = choreographies.some((choreography) => choreography.id === choreographyId)
    ? choreographyId
    : "";
  const shown = selected ? videos.filter((video) => video.choreography.id === selected) : videos;

  return (
    <div className="space-y-5">
      {choreographies.length > 1 && (
        // A dropdown: stays one line however many choreographies there are.
        <div className="sm:max-w-xs">
          <Label htmlFor="videos-choreography-filter" className="sr-only">
            {t("videosChoreographyFilter")}
          </Label>
          <Select
            id="videos-choreography-filter"
            className="w-full"
            value={selected}
            onChange={(event) => setChoreographyId(event.target.value)}
          >
            <option value="">{t("videosAllChoreographies")}</option>
            {choreographies.map((choreography) => (
              <option key={choreography.id} value={choreography.id}>
                {choreography.title}
              </option>
            ))}
          </Select>
        </div>
      )}
      <VideoGallery videos={shown} showChoreography={!selected} />
    </div>
  );
}
