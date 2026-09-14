"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function DeleteUserButton({
  userId,
  userName,
  redirectTo,
}: {
  userId: string;
  userName: string;
  redirectTo?: string;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(t("deleteUserConfirm", { name: userName }))) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("deleteUserError"));
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  return (
    <div>
      <Button
        type="button"
        variant="danger"
        onClick={() => void handleDelete()}
        disabled={loading}
      >
        {loading ? t("deleting") : t("deleteUser")}
      </Button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
