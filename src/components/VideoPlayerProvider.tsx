"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AddedOn,
  CloseIcon,
  UpNextList,
  urlWithVideo,
  useVideoTitle,
  VIDEO_PARAM,
  VideoPlayer,
  WatchDetails,
  type GalleryVideo,
  type VideoListOptions,
} from "@/components/VideoParts";
import { cn } from "@/lib/utils";

/** Room the mini player takes above the bottom bar (the "+" button and page end move up). */
const MINI_PLAYER_SPACE = "4.5rem";
const MINI_PLAYER_SPACE_VAR = "--mini-player-space";
/** A swipe down this long (or a quick flick) shrinks the sheet into the mini player. */
const SWIPE_MINIMIZE_PX = 120;
const SWIPE_FLICK_PX = 40;
const SWIPE_FLICK_SPEED_PX_PER_MS = 0.5;
const SWIPE_START_PX = 8;

type PlayerState = VideoListOptions & {
  video: GalleryVideo;
  videos: GalleryVideo[];
  autoPlay: boolean;
  expanded: boolean;
};

type VideoPlayerControls = {
  /** A tap on a video: the sheet opens with it playing. */
  open: (video: GalleryVideo, videos: GalleryVideo[], options: VideoListOptions) => void;
  /** The URL names a video (shared link, forward button): show it without adding a step. */
  showFromUrl: (video: GalleryVideo, videos: GalleryVideo[], options: VideoListOptions) => void;
};

const VideoPlayerContext = createContext<VideoPlayerControls | null>(null);

export function useVideoPlayer(): VideoPlayerControls {
  const controls = useContext(VideoPlayerContext);
  if (!controls) throw new Error("useVideoPlayer needs a VideoPlayerProvider.");
  return controls;
}

/**
 * The phone video player, for the whole app: a sheet over the page (player at the top, details
 * and next videos below) that a swipe down shrinks into a mini player above the bottom bar. The
 * mini player keeps playing while browsing; a tap opens it again. Desktops play videos in the
 * page instead (VideoGallery).
 */
export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [player, setPlayer] = useState<PlayerState | null>(null);
  // The open sheet added a history step (`?video=`): "back" shrinks it instead of leaving.
  const pushedRef = useRef(false);
  // The next history step back closes the player instead of shrinking it.
  const closingRef = useRef(false);

  const open = useCallback<VideoPlayerControls["open"]>((video, videos, options) => {
    setPlayer({ ...options, video, videos, autoPlay: true, expanded: true });
    const url = urlWithVideo(video.resource.id);
    if (pushedRef.current) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
      pushedRef.current = true;
    }
  }, []);

  const showFromUrl = useCallback<VideoPlayerControls["showFromUrl"]>((video, videos, options) => {
    setPlayer((current) => {
      if (current?.video.resource.id === video.resource.id) {
        return current.expanded ? current : { ...current, expanded: true };
      }
      return { ...options, video, videos, autoPlay: false, expanded: true };
    });
  }, []);

  const minimize = useCallback(() => {
    if (pushedRef.current) {
      window.history.back();
      return;
    }
    window.history.replaceState(null, "", urlWithVideo(null));
    setPlayer((current) => current && { ...current, expanded: false });
  }, []);

  const openVideoId = player?.video.resource.id;
  const expand = useCallback(() => {
    if (!openVideoId) return;
    window.history.pushState(null, "", urlWithVideo(openVideoId));
    pushedRef.current = true;
    setPlayer((current) => current && { ...current, expanded: true });
  }, [openVideoId]);

  const close = useCallback(() => {
    if (player?.expanded && pushedRef.current) {
      closingRef.current = true;
      window.history.back();
      return;
    }
    if (player?.expanded) {
      window.history.replaceState(null, "", urlWithVideo(null));
    }
    setPlayer(null);
  }, [player?.expanded]);

  // The next video replaces the open one, so "back" still shrinks the sheet.
  const switchTo = useCallback((video: GalleryVideo) => {
    window.history.replaceState(null, "", urlWithVideo(video.resource.id));
    setPlayer((current) => current && { ...current, video, autoPlay: true });
  }, []);

  // "Back" from the sheet: the `?video=` step is gone, so shrink (or close, after ✕).
  useEffect(() => {
    function onPopState() {
      if (new URL(window.location.href).searchParams.has(VIDEO_PARAM)) return;
      pushedRef.current = false;
      if (closingRef.current) {
        closingRef.current = false;
        setPlayer(null);
        return;
      }
      setPlayer((current) => current && { ...current, expanded: false });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // A link followed from the sheet (e.g. the choreography's name): keep playing, in the mini player.
  const previousPathname = useRef(pathname);
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    pushedRef.current = false;
    setPlayer((current) => current && (current.expanded ? { ...current, expanded: false } : current));
  }, [pathname]);

  const minimized = player !== null && !player.expanded;
  useEffect(() => {
    const root = document.documentElement;
    if (minimized) {
      root.style.setProperty(MINI_PLAYER_SPACE_VAR, MINI_PLAYER_SPACE);
    } else {
      root.style.removeProperty(MINI_PLAYER_SPACE_VAR);
    }
  }, [minimized]);

  const controls = useMemo(() => ({ open, showFromUrl }), [open, showFromUrl]);

  return (
    <VideoPlayerContext.Provider value={controls}>
      {children}
      {player &&
        createPortal(
          <FloatingPlayer
            player={player}
            onMinimize={minimize}
            onExpand={expand}
            onClose={close}
            onSelect={switchTo}
          />,
          document.body,
        )}
    </VideoPlayerContext.Provider>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Drag the sheet down to shrink it: from its top bar, the video (for YouTube, the layer over its
 * top part), or its details once scrolled to the top.
 */
function useSwipeDownToMinimize(
  sheetRef: React.RefObject<HTMLDivElement | null>,
  detailsRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onMinimize: () => void,
) {
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !enabled) return;
    let startY: number | null = null;
    let startTime = 0;
    let distance = 0;
    let dragging = false;

    function reset(animate: boolean) {
      if (!sheet) return;
      sheet.style.transition = animate ? "transform 200ms ease-out" : "";
      sheet.style.transform = "";
      startY = null;
      dragging = false;
    }

    function onTouchStart(event: TouchEvent) {
      const details = detailsRef.current;
      if (details && details.contains(event.target as Node) && details.scrollTop > 0) return;
      startY = event.touches[0].clientY;
      startTime = event.timeStamp;
      distance = 0;
      dragging = false;
    }

    function onTouchMove(event: TouchEvent) {
      if (startY === null || !sheet) return;
      distance = event.touches[0].clientY - startY;
      if (!dragging) {
        if (distance < -SWIPE_START_PX) {
          startY = null; // Scrolling up through the details.
          return;
        }
        if (distance < SWIPE_START_PX) return;
        dragging = true;
      }
      event.preventDefault();
      sheet.style.transition = "none";
      sheet.style.transform = `translateY(${Math.max(0, distance)}px)`;
    }

    function onTouchEnd(event: TouchEvent) {
      if (!dragging) {
        startY = null;
        return;
      }
      const speed = distance / Math.max(1, event.timeStamp - startTime);
      const minimize =
        distance > SWIPE_MINIMIZE_PX ||
        (distance > SWIPE_FLICK_PX && speed > SWIPE_FLICK_SPEED_PX_PER_MS);
      reset(!minimize);
      if (minimize) onMinimize();
    }

    // Not passive: a drag must stop the details from scrolling (preventDefault).
    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", onTouchEnd);
    sheet.addEventListener("touchcancel", onTouchEnd);
    return () => {
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", onTouchEnd);
      sheet.removeEventListener("touchcancel", onTouchEnd);
      reset(false);
    };
  }, [detailsRef, enabled, onMinimize, sheetRef]);
}

/**
 * One element for both states, so the video keeps playing: the sheet over the page, or the mini
 * player above the bottom bar. The children keep their places; only classes change.
 */
function FloatingPlayer({
  player,
  onMinimize,
  onExpand,
  onClose,
  onSelect,
}: {
  player: PlayerState;
  onMinimize: () => void;
  onExpand: () => void;
  onClose: () => void;
  onSelect: (video: GalleryVideo) => void;
}) {
  const t = useTranslations("Components");
  const title = useVideoTitle();
  const sheetRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const minimizeRef = useRef<HTMLButtonElement>(null);
  const { video, expanded } = player;

  useSwipeDownToMinimize(sheetRef, detailsRef, expanded, onMinimize);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    minimizeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    function minimizeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onMinimize();
    }
    window.addEventListener("keydown", minimizeOnEscape);
    return () => window.removeEventListener("keydown", minimizeOnEscape);
  }, [expanded, onMinimize]);

  // Another video from the list: its details start at the top.
  useEffect(() => {
    detailsRef.current?.scrollTo({ top: 0 });
  }, [video.resource.id]);

  const iconButton =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition";

  return (
    <div
      ref={sheetRef}
      role={expanded ? "dialog" : "region"}
      aria-modal={expanded ? true : undefined}
      aria-label={title(video.resource)}
      className={cn(
        expanded
          ? "fixed inset-0 z-50 flex flex-col bg-white phone-landscape:bg-black"
          : "fixed inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex h-16 items-stretch overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-stone-200 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-96",
      )}
    >
      {expanded && (
        // The grip: drag it (or the video) down to shrink the sheet.
        <div className="relative flex shrink-0 touch-none items-center justify-between bg-black px-2 pt-[env(safe-area-inset-top)] text-white phone-landscape:absolute phone-landscape:inset-x-0 phone-landscape:top-2 phone-landscape:z-10 phone-landscape:bg-transparent phone-landscape:px-[max(0.5rem,env(safe-area-inset-left))] phone-landscape:pt-0 phone-landscape:pointer-events-none">
          <button
            ref={minimizeRef}
            type="button"
            onClick={onMinimize}
            aria-label={t("minimizeVideo")}
            title={t("minimizeVideo")}
            className={cn(iconButton, "hover:bg-white/15 phone-landscape:pointer-events-auto phone-landscape:bg-black/50")}
          >
            <ChevronDownIcon />
          </button>
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-white/40 phone-landscape:hidden" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeVideo")}
            title={t("closeVideo")}
            className={cn(iconButton, "hover:bg-white/15 phone-landscape:pointer-events-auto phone-landscape:bg-black/50")}
          >
            <CloseIcon />
          </button>
        </div>
      )}
      <div className={cn("relative shrink-0", expanded ? "phone-landscape:h-full" : "aspect-video h-full")}>
        <VideoPlayer
          key={video.resource.id}
          video={video}
          autoPlay={player.autoPlay}
          variant={expanded ? "sheet" : "mini"}
        />
        {!expanded && (
          // Taps on the small video open it again rather than reaching the player's own controls.
          <button
            type="button"
            onClick={onExpand}
            aria-label={t("expandVideo")}
            className="absolute inset-0"
          />
        )}
      </div>
      {expanded ? (
        <div
          ref={detailsRef}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] phone-landscape:hidden"
        >
          <WatchDetails
            video={video}
            showChoreography={player.showChoreography}
            renderActions={player.renderActions}
          />
          <UpNextList
            upNext={player.videos.filter((item) => item.resource.id !== video.resource.id)}
            showChoreography={player.showChoreography}
            onSelect={onSelect}
          />
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center">
          <button type="button" onClick={onExpand} className="min-w-0 flex-1 px-3 text-left">
            <span className="block truncate text-sm font-medium text-stone-900">
              {title(video.resource)}
            </span>
            <span className="block truncate text-xs text-stone-500">
              {player.showChoreography ? video.choreography.title : <AddedOn createdAt={video.resource.createdAt} />}
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeVideo")}
            title={t("closeVideo")}
            className={cn(iconButton, "mr-1 text-stone-600 hover:bg-stone-100 hover:text-stone-900")}
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
