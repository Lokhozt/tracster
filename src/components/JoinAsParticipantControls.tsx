"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function JoinAsParticipantControls({
  joinUrl,
  requestUrl,
  allowJoin,
  allowRequest,
  isParticipant,
  hasPendingRequest,
}: {
  joinUrl: string;
  requestUrl: string;
  allowJoin: boolean;
  allowRequest: boolean;
  isParticipant: boolean;
  hasPendingRequest: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isParticipant || (!allowJoin && !allowRequest && !hasPendingRequest)) {
    return null;
  }

  async function submit(url: string, method: "POST" | "DELETE") {
    setLoading(true);
    setError(null);
    const response = await fetch(url, { method });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to update participation.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      {allowJoin && (
        <Button type="button" disabled={loading} onClick={() => void submit(joinUrl, "POST")}>
          {loading ? "Joining..." : "Join as participant"}
        </Button>
      )}
      {allowRequest && !hasPendingRequest && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => void submit(requestUrl, "POST")}
        >
          {loading ? "Sending..." : "Request to join"}
        </Button>
      )}
      {hasPendingRequest && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-stone-600">Your request to join is pending.</p>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => void submit(requestUrl, "DELETE")}
          >
            {loading ? "Cancelling..." : "Cancel request"}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
