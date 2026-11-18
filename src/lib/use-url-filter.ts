"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * A list filter kept in the page address (`?key=value`, replaced in place), so coming back from
 * a detail page finds it as it was: the browser restores the address, while the page itself may
 * come from Next's cache with older server props. `fallback` applies when the address has none
 * (a saved cookie choice, or the default).
 *
 * An empty value leaves the address unless `keepEmpty` (a saved choice that "nothing" must
 * override, e.g. no hidden event types).
 */
export function useUrlFilter(
  key: string,
  fallback: string,
  { keepEmpty = false }: { keepEmpty?: boolean } = {},
): [string, (value: string) => void] {
  const searchParams = useSearchParams();
  // Local state for the value itself: typing stays instant, the address follows.
  const [value, setValue] = useState(() => searchParams.get(key) ?? fallback);

  function update(next: string) {
    setValue(next);
    const url = new URL(window.location.href);
    if (next === "" && !keepEmpty) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, next);
    }
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  return [value, update];
}
