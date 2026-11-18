"use client";

import { useEffect, useState } from "react";

/**
 * Short-lived, permission-checked URL of a choreography resource file. `enabled: false` skips
 * the request (Office files are read through their raw route instead).
 */
export function useResourceFileUrl(
  choreographyId: string,
  resourceId: string,
  { enabled = true, fallbackError }: { enabled?: boolean; fallbackError: string },
) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch(`/api/choreographies/${choreographyId}/resources/${resourceId}/content`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? fallbackError);
        }
        return response.json();
      })
      .then((body) => {
        if (!cancelled) setUrl(body.url);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, [choreographyId, enabled, fallbackError, resourceId]);

  return { url, error };
}
