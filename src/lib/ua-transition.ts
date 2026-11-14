"use client";

// Last time the browser itself animated a history step (iOS edge swipe, Android predictive
// back): `PopStateEvent.hasUAVisualTransition`. Our own slide must not play on top of it.
let lastUAVisualTransitionAt = 0;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", (event) => {
    if ((event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) {
      lastUAVisualTransitionAt = Date.now();
    }
  });
}

/** True right after a history step the browser already animated (skip the in-app slide). */
export function browserJustAnimated(): boolean {
  return Date.now() - lastUAVisualTransitionAt < 1000;
}
