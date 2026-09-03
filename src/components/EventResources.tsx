"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import type {
  ChoreographyResourceVisibility,
  SerializedChoreographyResource,
} from "@/lib/choreography-resources";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}

function ImageViewer({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const t = useTranslations("Components");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = Array.from(
      dialogRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function zoom(next: number) {
    setScale(Math.min(5, Math.max(0.5, next)));
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition((current) => ({
      x: current.x + event.clientX - drag.x,
      y: current.y + event.clientY - drag.y,
    }));
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    zoom(scale + (event.deltaY < 0 ? 0.2 : -0.2));
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={t("resourceImageViewer")}
      onKeyDown={handleDialogKeyDown}
    >
      <div className="flex items-center justify-end gap-2 p-3">
        <Button type="button" variant="secondary" onClick={() => zoom(scale - 0.25)}>
          {t("zoomOut")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
        >
          {t("reset")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => zoom(scale + 0.25)}>
          {t("zoomIn")}
        </Button>
        <button
          ref={closeRef}
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
          onClick={onClose}
        >
          {t("close")}
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 touch-none cursor-grab items-center justify-center overflow-hidden active:cursor-grabbing"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onWheel={handleWheel}
      >
        {/* The source is a short-lived, permission-checked S3 URL. */}
        {/* Signed resource URLs are dynamic and cannot use Next's image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-[85vh] max-w-[90vw] select-none object-contain"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 100ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

function ResourceDownloadButton({
  choreographyId,
  resource,
}: {
  choreographyId: string;
  resource: SerializedChoreographyResource;
}) {
  const t = useTranslations("Components");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/choreographies/${choreographyId}/resources/${resource.id}/content?download=1`,
      );
      if (!response.ok) throw new Error(await responseError(response, t("resourceDownloadError")));
      const body = await response.json();
      const link = document.createElement("a");
      link.href = body.url;
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("resourceDownloadError"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="text-sm font-medium text-stone-800 hover:text-stone-600 disabled:opacity-50"
        disabled={downloading}
        onClick={download}
      >
        {downloading ? t("downloading") : t("download")}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FileResource({
  choreographyId,
  resource,
}: {
  choreographyId: string;
  resource: SerializedChoreographyResource;
}) {
  const t = useTranslations("Components");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/choreographies/${choreographyId}/resources/${resource.id}/content`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response, t("resourceLoadError")));
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
  }, [choreographyId, resource.id, t]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!url) return <p className="text-sm text-stone-500">{t("loading")}</p>;

  const label = resource.fileName ?? t("resourceFile");
  if (resource.mediaKind === "audio") {
    return <audio className="w-full" controls preload="metadata" src={url} />;
  }
  if (resource.mediaKind === "video") {
    return <video className="max-h-[32rem] w-full rounded-lg bg-black" controls preload="metadata" src={url} />;
  }
  if (resource.mediaKind === "image") {
    return (
      <>
        <button
          type="button"
          className="block overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
          onClick={() => setViewerOpen(true)}
          aria-label={t("openImage", { name: label })}
        >
          {/* Signed resource URLs are dynamic and cannot use Next's image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={resource.description ?? label} className="max-h-80 w-auto object-contain" />
        </button>
        {viewerOpen && (
          <ImageViewer
            src={url}
            alt={resource.description ?? label}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </>
    );
  }
  return (
    <a className="font-medium text-stone-800 underline hover:text-stone-600" href={url} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function ResourceCard({
  choreographyId,
  resource,
  canEdit,
}: {
  choreographyId: string;
  resource: SerializedChoreographyResource;
  canEdit: boolean;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(t("deleteResourceConfirm"))) return;
    setDeleting(true);
    setError(null);
    const response = await fetch(`/api/choreographies/${choreographyId}/resources/${resource.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!response.ok) {
      setError(await responseError(response, t("resourceDeleteError")));
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
            {t(`resourceVisibility.${resource.visibility}`)}
          </span>
          {resource.fileName && <span className="text-sm font-medium">{resource.fileName}</span>}
        </div>
        <div className="flex shrink-0 items-start gap-3">
          {resource.type === "FILE" && (
            <ResourceDownloadButton choreographyId={choreographyId} resource={resource} />
          )}
          {canEdit && (
            <button
              type="button"
              className="text-sm text-red-700 hover:text-red-900 disabled:opacity-50"
              disabled={deleting}
              onClick={remove}
            >
              {deleting ? t("deleting") : t("delete")}
            </button>
          )}
        </div>
      </div>
      {resource.description && <p className="mb-3 whitespace-pre-wrap text-sm text-stone-600">{resource.description}</p>}
      {resource.type === "LINK" && resource.youtubeId ? (
        <div className="aspect-video overflow-hidden rounded-lg">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${resource.youtubeId}`}
            title={resource.description ?? t("youtubeVideo")}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : resource.type === "LINK" && resource.url ? (
        <a className="break-all font-medium text-stone-800 underline hover:text-stone-600" href={resource.url} target="_blank" rel="noopener noreferrer">
          {resource.url}
        </a>
      ) : (
        <FileResource choreographyId={choreographyId} resource={resource} />
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function uploadFile(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    Object.entries(headers).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Upload failed (${request.status}).`));
    };
    request.onerror = () => reject(new Error("Upload failed."));
    request.send(file);
  });
}

function ResourceForm({ choreographyId }: { choreographyId: string }) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [kind, setKind] = useState<"LINK" | "FILE">("LINK");
  const [visibility, setVisibility] = useState<ChoreographyResourceVisibility>("ALL");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    let pendingResourceId: string | null = null;
    setSaving(true);
    setError(null);
    setProgress(null);
    try {
      if (kind === "LINK") {
        const response = await fetch(`/api/choreographies/${choreographyId}/resources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, description: description || undefined, visibility }),
        });
        if (!response.ok) throw new Error(await responseError(response, t("resourceCreateError")));
        setUrl("");
      } else {
        if (!file) throw new Error(t("selectResourceFile"));
        const initiate = await fetch(`/api/choreographies/${choreographyId}/resources/uploads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            description: description || undefined,
            visibility,
          }),
        });
        if (!initiate.ok) throw new Error(await responseError(initiate, t("resourceUploadError")));
        const upload = await initiate.json();
        pendingResourceId = upload.resourceId;
        await uploadFile(upload.uploadUrl, file, upload.headers, setProgress);
        const complete = await fetch(
          `/api/choreographies/${choreographyId}/resources/${upload.resourceId}/complete`,
          { method: "POST" },
        );
        if (!complete.ok) throw new Error(await responseError(complete, t("resourceUploadError")));
        pendingResourceId = null;
        setFile(null);
        const input = document.getElementById(`choreography-resource-file-${choreographyId}`) as HTMLInputElement | null;
        if (input) input.value = "";
      }
      setDescription("");
      setProgress(null);
      router.refresh();
    } catch (reason) {
      if (pendingResourceId) {
        await fetch(`/api/choreographies/${choreographyId}/resources/${pendingResourceId}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      setError(reason instanceof Error ? reason.message : t("resourceCreateError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-6 border-t border-stone-100 pt-6" onSubmit={submit}>
      <h3 className="mb-4 font-semibold">{t("addResource")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`resource-kind-${choreographyId}`}>{t("resourceType")}</Label>
          <Select id={`resource-kind-${choreographyId}`} className="w-full" value={kind} onChange={(event) => setKind(event.target.value as "LINK" | "FILE")}>
            <option value="LINK">{t("resourceLink")}</option>
            <option value="FILE">{t("resourceFile")}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor={`resource-visibility-${choreographyId}`}>{t("visibility")}</Label>
          <Select id={`resource-visibility-${choreographyId}`} className="w-full" value={visibility} onChange={(event) => setVisibility(event.target.value as ChoreographyResourceVisibility)}>
            <option value="ALL">{t("resourceVisibility.ALL")}</option>
            <option value="PARTICIPANT">{t("resourceVisibility.PARTICIPANT")}</option>
            <option value="CHOREOGRAPHER">{t("resourceVisibility.CHOREOGRAPHER")}</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          {kind === "LINK" ? (
            <>
              <Label htmlFor={`resource-url-${choreographyId}`}>{t("resourceUrl")}</Label>
              <Input key="resource-link" id={`resource-url-${choreographyId}`} type="url" inputMode="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" />
            </>
          ) : (
            <>
              <Label htmlFor={`choreography-resource-file-${choreographyId}`}>{t("resourceFile")}</Label>
              <Input
                key="resource-file"
                id={`choreography-resource-file-${choreographyId}`}
                type="file"
                required
                accept="image/*,audio/*,video/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-stone-500">{t("resourceFileHelp")}</p>
            </>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`resource-description-${choreographyId}`}>{t("description")}</Label>
          <Textarea id={`resource-description-${choreographyId}`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder={t("resourceDescriptionPlaceholder")} />
        </div>
      </div>
      {progress !== null && (
        <div className="mt-4">
          <p className="mb-1 text-sm text-stone-600">{t("uploadProgress", { progress })}</p>
          <div className="h-2 overflow-hidden rounded bg-stone-200">
            <div className="h-full bg-stone-800 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <Button className="mt-4" type="submit" disabled={saving}>
        {saving ? t("savingResource") : t("addResource")}
      </Button>
    </form>
  );
}

export function ChoreographyResources({
  choreographyId,
  resources,
  canEdit,
}: {
  choreographyId: string;
  resources: SerializedChoreographyResource[];
  canEdit: boolean;
}) {
  const t = useTranslations("Components");
  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-lg font-semibold">{t("choreographyResources")}</h2>
      {resources.length === 0 ? (
        <p className="text-sm text-stone-600">{t("noChoreographyResources")}</p>
      ) : (
        <div className="space-y-4">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} choreographyId={choreographyId} resource={resource} canEdit={canEdit} />
          ))}
        </div>
      )}
      {canEdit && <ResourceForm choreographyId={choreographyId} />}
    </Card>
  );
}
