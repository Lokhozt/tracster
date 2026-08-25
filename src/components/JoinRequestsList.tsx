"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

export type JoinRequestItem = {
  id: string;
  name: string;
  email: string;
};

export function JoinRequestsList({
  requests,
  reviewUrl,
}: {
  requests: JoinRequestItem[];
  reviewUrl: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(userId: string, action: "accept" | "decline") {
    setLoadingId(userId);
    setError(null);

    const response = await fetch(reviewUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const data = await response.json().catch(() => ({}));
    setLoadingId(null);

    if (!response.ok) {
      setError(data.error ?? "Unable to update request.");
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Join requests</h2>
      {requests.length === 0 ? (
        <p className="text-sm text-stone-600">No pending requests.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2"
            >
              <div>
                <p className="font-medium">{request.name}</p>
                <p className="text-sm text-stone-500">{request.email}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => void decide(request.id, "accept")}
                >
                  {loadingId === request.id ? "Saving..." : "Add"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loadingId !== null}
                  onClick={() => void decide(request.id, "decline")}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
