"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

type Point = { x: number; y: number };

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function ViewerButton({
  label,
  onClick,
  disabled = false,
  buttonRef,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      // Literal white: the dark theme turns `white` into a dark surface colour.
      className="inline-flex size-11 items-center justify-center rounded-full bg-[#fff]/10 text-[#fff] transition hover:bg-[#fff]/20 focus-visible:ring-2 focus-visible:ring-[#fff] focus-visible:outline-none disabled:opacity-40"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

/**
 * Full-screen image viewer (resources, documents). Rendered on `body`: a page section moved with
 * a transform (the choreography's swipeable sections) would otherwise hold a `fixed` layer inside
 * itself. Pinch, double tap, wheel or the buttons zoom; dragging pans a zoomed image. Back (the
 * phone's gesture or button) closes it, like the video player.
 */
export function ImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const t = useTranslations("Components");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Every finger (or the mouse) on the image, for panning and pinching.
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const lastTapRef = useRef(0);
  const [scale, setScale] = useState(MIN_SCALE);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  // The history entry added on open: Back takes it off and closes the viewer, not the page.
  const historyEntryRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    historyEntryRef.current = true;
    function onPopState() {
      historyEntryRef.current = false;
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // The buttons and Escape go back too, so the added entry never lingers.
  function close() {
    if (historyEntryRef.current) {
      window.history.back();
    } else {
      onClose();
    }
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function zoom(next: number) {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    setScale(clamped);
    // Back at full view, the image recentres.
    if (clamped === MIN_SCALE) setPosition({ x: 0, y: 0 });
  }

  function reset() {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key === "+" || event.key === "=") zoom(scale + 0.5);
    if (event.key === "-") zoom(scale - 0.5);
    if (event.key !== "Tab") return;
    const buttons = Array.from(
      dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
    );
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointers = pointersRef.current;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setIsGesturing(true);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchRef.current = { distance: distance(a, b), scale };
      return;
    }
    // A second tap soon after the first: zoom in, or back out.
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      if (scale > MIN_SCALE) reset();
      else zoom(DOUBLE_TAP_SCALE);
    } else {
      lastTapRef.current = now;
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointers = pointersRef.current;
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);

    const pinch = pinchRef.current;
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      zoom((pinch.scale * distance(a, b)) / pinch.distance);
      return;
    }
    // One finger pans, only once zoomed in (at full view there is nothing to move).
    if (scale > MIN_SCALE) {
      setPosition((position) => ({
        x: position.x + current.x - previous.x,
        y: position.y + current.y - previous.y,
      }));
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const pointers = pointersRef.current;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchRef.current = null;
    if (pointers.size === 0) setIsGesturing(false);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    zoom(scale + (event.deltaY < 0 ? 0.25 : -0.25));
  }

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={t("resourceImageViewer")}
      onKeyDown={handleKeyDown}
    >
      {/* Over the image, clear of the phone's status bar: zoom on the left, close on the right. */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <ViewerButton label={t("zoomOut")} onClick={() => zoom(scale - 0.5)} disabled={scale <= MIN_SCALE}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M8 11h6" />
          </ViewerButton>
          <ViewerButton label={t("zoomIn")} onClick={() => zoom(scale + 0.5)} disabled={scale >= MAX_SCALE}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M8 11h6M11 8v6" />
          </ViewerButton>
          {scale > MIN_SCALE && (
            <ViewerButton label={t("reset")} onClick={reset}>
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </ViewerButton>
          )}
        </div>
        <ViewerButton label={t("close")} onClick={close} buttonRef={closeRef}>
          <path d="M18 6 6 18M6 6l12 12" />
        </ViewerButton>
      </div>
      <div
        className={cn(
          "relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden select-none",
          scale > MIN_SCALE && "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* A short-lived, permission-checked storage link: Next's image optimizer cannot use it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isGesturing ? "none" : "transform 150ms ease-out",
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
