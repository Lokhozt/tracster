"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";

export function EventShareControls({ eventId }: { eventId: string }) {
  const t = useTranslations("Components");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadShareLink() {
      try {
        const response = await fetch(`/api/events/${eventId}/share`);
        const data = await response.json();
        if (!cancelled) {
          if (response.ok) {
            setUrl(data.url ?? null);
          } else {
            setError(data.error ?? t("eventShareLoadError"));
          }
        }
      } catch {
        if (!cancelled) {
          setError(t("eventShareLoadError"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadShareLink();
    return () => {
      cancelled = true;
    };
  }, [eventId, t]);

  async function createLink() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/share`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? t("eventShareCreateError"));
        return;
      }
      setUrl(data.url);
      setMessage(t("eventShareCreated"));
    } catch {
      setError(t("eventShareCreateError"));
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!url) {
      return;
    }
    setMessage(null);
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setMessage(t("eventShareCopied"));
    } catch {
      setError(t("eventShareCopyError"));
    }
  }

  async function revokeLink() {
    if (!window.confirm(t("eventShareRevokeConfirm"))) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/share`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? t("eventShareRevokeError"));
        return;
      }
      setUrl(null);
      setMessage(t("eventShareRevoked"));
    } catch {
      setError(t("eventShareRevokeError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">{t("eventShareHelp")}</p>

      {url ? (
        <>
          <Input
            value={url}
            readOnly
            aria-label={t("eventShareLink")}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={copyLink}>
              {t("copyLink")}
            </Button>
            <Button type="button" variant="danger" disabled={saving} onClick={revokeLink}>
              {saving ? t("saving") : t("revokeLink")}
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" disabled={saving} onClick={createLink}>
          {saving ? t("saving") : t("createShareLink")}
        </Button>
      )}

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
