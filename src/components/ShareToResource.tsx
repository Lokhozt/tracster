"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, FormError, Label, Select, Textarea } from "@/components/ui";
import type { ChoreographyResourceVisibility } from "@/lib/choreography-resources";
import {
  createChoreographyFileResource,
  createChoreographyLinkResource,
  UploadFailedError,
} from "@/lib/resource-upload";
import { withUrlScheme } from "@/lib/utils";

/** Must match public/sw.js. */
const SHARE_CACHE = "tracster-share-v1";

type SharedDetails = { title: string; text: string; url: string; hasFile: boolean };
type SharedItem =
  | { kind: "file"; file: Blob; fileName: string; description: string }
  | { kind: "link"; url: string; description: string };

const URL_IN_TEXT = /https?:\/\/\S+/;

async function readShare(): Promise<SharedItem | null> {
  if (!("caches" in window)) return null;
  const cache = await caches.open(SHARE_CACHE);
  const detailsResponse = await cache.match("/shared/details");
  if (!detailsResponse) return null;
  const details = (await detailsResponse.json()) as SharedDetails;
  // Apps put a shared link in `url` or inside `text` (YouTube does the latter).
  const linkInText = details.text.match(URL_IN_TEXT)?.[0] ?? "";
  const textWithoutLink = details.text.replace(URL_IN_TEXT, "").trim();
  const description = details.title || textWithoutLink;
  if (details.hasFile) {
    const fileResponse = await cache.match("/shared/file");
    if (!fileResponse) return null;
    return {
      kind: "file",
      file: await fileResponse.blob(),
      fileName: decodeURIComponent(fileResponse.headers.get("X-File-Name") ?? "video"),
      description,
    };
  }
  const url = details.url || linkInText;
  return url ? { kind: "link", url, description } : null;
}

async function clearShare() {
  if ("caches" in window) await caches.delete(SHARE_CACHE);
}

function formatMegabytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} Mo`;
}

export function ShareToResource({
  choreographies,
  maxBytes,
  storageReady,
  missed,
}: {
  choreographies: { id: string; title: string }[];
  maxBytes: number;
  /** File storage configured on the server (uploads need it; links do not). */
  storageReady: boolean;
  /** The share reached the server instead of the service worker: nothing was kept. */
  missed: boolean;
}) {
  const t = useTranslations("Pages.Share");
  const tc = useTranslations("Components");
  const router = useRouter();
  const [item, setItem] = useState<SharedItem | null | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [choreographyId, setChoreographyId] = useState(choreographies[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ChoreographyResourceVisibility>("ALL");
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    readShare()
      .then((shared) => {
        setItem(shared);
        if (shared) setDescription(shared.description);
        if (shared?.kind === "file") {
          objectUrl = URL.createObjectURL(shared.file);
          setPreviewUrl(objectUrl);
        }
      })
      .catch(() => setItem(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  if (item === undefined) {
    return <p className="text-stone-600">{t("loading")}</p>;
  }

  if (item === null) {
    return (
      <Card className="max-w-xl space-y-2">
        {missed && <p className="font-medium text-stone-900">{t("missed")}</p>}
        <p className="text-stone-700">{t("howTo")}</p>
        <p className="text-sm text-stone-500">{t("howToIphone")}</p>
      </Card>
    );
  }

  const tooBig = item.kind === "file" && item.file.size > maxBytes;
  const blocked =
    choreographies.length === 0
      ? t("noChoreography")
      : item.kind === "file" && !storageReady
        ? t("noStorage")
        : tooBig
          ? t("tooBig", { size: formatMegabytes(item.file.size), max: formatMegabytes(maxBytes) })
          : null;
  const mediaType = item.kind === "file" ? item.file.type.split("/")[0] : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!item || blocked) return;
    setSaving(true);
    setError(null);
    setProgress(item.kind === "file" ? 0 : null);
    try {
      const details = { choreographyId, description, visibility };
      if (item.kind === "file") {
        await createChoreographyFileResource({
          ...details,
          file: item.file,
          fileName: item.fileName,
          fallbackError: tc("resourceUploadError"),
          onProgress: setProgress,
        });
      } else {
        await createChoreographyLinkResource({
          ...details,
          url: withUrlScheme(item.url),
          fallbackError: tc("resourceCreateError"),
        });
      }
      await clearShare();
      router.replace(`/choreographies/${choreographyId}?section=resources`);
    } catch (reason) {
      setError(
        reason instanceof UploadFailedError
          ? tc("uploadFailed")
          : reason instanceof Error
            ? reason.message
            : tc("resourceCreateError"),
      );
      setProgress(null);
    } finally {
      setSaving(false);
    }
  }

  async function discard() {
    await clearShare();
    router.replace("/");
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <Card className="space-y-2">
        {item.kind === "file" && previewUrl && mediaType === "video" && (
          <video src={previewUrl} controls playsInline className="max-h-72 w-full rounded-lg bg-black" />
        )}
        {item.kind === "file" && previewUrl && mediaType === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of a shared file
          <img src={previewUrl} alt="" className="max-h-72 w-full rounded-lg object-contain" />
        )}
        {item.kind === "file" && previewUrl && mediaType === "audio" && (
          <audio src={previewUrl} controls className="w-full" />
        )}
        <p className="truncate text-sm text-stone-600">
          {item.kind === "file" ? `${item.fileName} · ${formatMegabytes(item.file.size)}` : item.url}
        </p>
      </Card>

      {blocked ? (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">{blocked}</p>
      ) : (
        <>
          <div>
            <Label htmlFor="share-choreography">{t("choreography")}</Label>
            <Select
              id="share-choreography"
              className="w-full"
              value={choreographyId}
              onChange={(event) => setChoreographyId(event.target.value)}
            >
              {choreographies.map((choreography) => (
                <option key={choreography.id} value={choreography.id}>
                  {choreography.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="share-description">{tc("description")}</Label>
            <Textarea
              id="share-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          <div>
            <Label htmlFor="share-visibility">{tc("visibility")}</Label>
            <Select
              id="share-visibility"
              className="w-full"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as ChoreographyResourceVisibility)}
            >
              <option value="ALL">{tc("resourceVisibility.ALL")}</option>
              <option value="PARTICIPANT">{tc("resourceVisibility.PARTICIPANT")}</option>
              <option value="CHOREOGRAPHER">{tc("resourceVisibility.CHOREOGRAPHER")}</option>
            </Select>
          </div>
        </>
      )}

      {progress !== null && (
        <div>
          <div
            className="h-2 overflow-hidden rounded-full bg-stone-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={t("uploading")}
          >
            <div className="h-full rounded-full bg-stone-900 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {t("uploadingProgress", { progress })} · {t("keepOpen")}
          </p>
        </div>
      )}
      <FormError>{error}</FormError>

      <div className="flex flex-wrap gap-2">
        {!blocked && (
          <Button type="submit" disabled={saving || !choreographyId}>
            {saving ? tc("saving") : t("submit")}
          </Button>
        )}
        <Button type="button" variant="ghost" disabled={saving} onClick={() => void discard()}>
          {t("discard")}
        </Button>
      </div>
    </form>
  );
}
