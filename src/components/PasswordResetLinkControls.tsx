"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import {
  PASSWORD_RESET_DURATION_HOURS,
  type PasswordResetDurationHours,
} from "@/lib/password-reset-helpers";

const durationLabels = {
  1: "passwordResetDuration1h",
  24: "passwordResetDuration24h",
  168: "passwordResetDuration7d",
} as const;

export function PasswordResetLinkControls({ userId }: { userId: string }) {
  const t = useTranslations("Components");
  const locale = useLocale();
  const [hours, setHours] = useState<PasswordResetDurationHours>(24);
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveLink() {
      try {
        const response = await fetch(`/api/users/${userId}/password-reset`);
        const data = await response.json();
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setError(data.error ?? t("passwordResetLoadError"));
          return;
        }
        setExpiresAt(data.expiresAt ?? null);
      } catch {
        if (!cancelled) {
          setError(t("passwordResetLoadError"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadActiveLink();
    return () => {
      cancelled = true;
    };
  }, [t, userId]);

  async function generateLink() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? t("passwordResetCreateError"));
        return;
      }
      setUrl(data.url);
      setExpiresAt(data.expiresAt);
      setMessage(t("passwordResetCreated"));
    } catch {
      setError(t("passwordResetCreateError"));
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
      setMessage(t("passwordResetCopied"));
    } catch {
      setError(t("passwordResetCopyError"));
    }
  }

  async function revokeLink() {
    if (!window.confirm(t("passwordResetRevokeConfirm"))) {
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}/password-reset`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? t("passwordResetRevokeError"));
        return;
      }
      setUrl(null);
      setExpiresAt(null);
      setMessage(t("passwordResetRevoked"));
    } catch {
      setError(t("passwordResetRevokeError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const expiryLabel = expiresAt
    ? formatDateTime(new Date(expiresAt), locale as "en" | "fr")
    : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">{t("passwordResetHelp")}</p>
      <div>
        <Label htmlFor="password-reset-duration">{t("passwordResetDuration")}</Label>
        <Select
          id="password-reset-duration"
          className="mt-1 block w-full"
          value={String(hours)}
          onChange={(event) =>
            setHours(Number(event.target.value) as PasswordResetDurationHours)
          }
        >
          {PASSWORD_RESET_DURATION_HOURS.map((option) => (
            <option key={option} value={option}>
              {t(durationLabels[option])}
            </option>
          ))}
        </Select>
      </div>

      {url && (
        <>
          <p className="text-sm text-amber-800">{t("passwordResetShownOnce")}</p>
          <Input
            value={url}
            readOnly
            aria-label={t("passwordResetLink")}
            onFocus={(event) => event.currentTarget.select()}
          />
        </>
      )}

      {expiryLabel && (
        <p className="text-sm text-stone-600">
          {t("passwordResetActiveUntil", { date: expiryLabel })}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving} onClick={generateLink}>
          {saving
            ? t("saving")
            : expiresAt
              ? t("passwordResetNewLink")
              : t("passwordResetGenerate")}
        </Button>
        {url && (
          <Button type="button" variant="secondary" onClick={copyLink}>
            {t("passwordResetCopy")}
          </Button>
        )}
        {expiresAt && (
          <Button type="button" variant="danger" disabled={saving} onClick={revokeLink}>
            {t("passwordResetRevoke")}
          </Button>
        )}
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
