"use client";

import { useEffect } from "react";

/**
 * Publishes the sticky header's real height (it varies with the seasonal strip and the safe
 * area) as --app-header-h, used as scroll padding: when a page opens and the router scrolls it
 * into view, its top lands under the header instead of behind it.
 */
export function HeaderHeight() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-app-header]");
    if (!header) {
      return;
    }
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--app-header-h", `${header.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return null;
}
