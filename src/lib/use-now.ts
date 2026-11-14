"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 60_000;
let current = Date.now();
const listeners = new Set<() => void>();
let timer: number | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    current = Date.now();
    timer = window.setInterval(() => {
      current = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * The current time, refreshed every minute by one shared timer. Null on the server and during
 * hydration (the viewer's clock decides what is "finished"), so markup stays identical.
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
