"use client";

import { useEffect } from "react";

/** Registers public/sw.js (share target for the installed app). Silent where unsupported. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
  }, []);
  return null;
}
