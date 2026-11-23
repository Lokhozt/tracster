"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { DocumentTypeIcon } from "@/components/DocumentTypeIcon";
import { ImageViewer } from "@/components/ImageViewer";
import { OfficeFileViewer } from "@/components/OfficeFileViewer";
import { PdfViewer, ResourceLink } from "@/components/ResourceLink";
import { SectionNav } from "@/components/SettingsSections";
import { documentDisplayType } from "@/lib/document-type";
import type { SerializedDocument, SerializedDocumentCategory } from "@/lib/documents";
import {
  Button,
  Card,
  Field,
  FormActions,
  FormError,
  Input,
  Label,
  SegmentedControl,
  Select,
  Textarea,
} from "@/components/ui";
import { useAppNavigation } from "@/lib/app-navigation";
import { withUrlScheme } from "@/lib/utils";

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}

function DocumentDownloadButton({ document }: { document: SerializedDocument }) {
  const t = useTranslations("Components");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${document.id}/content?download=1`);
      if (!response.ok) throw new Error(await responseError(response, t("resourceDownloadError")));
      const body = await response.json();
      const link = window.document.createElement("a");
      link.href = body.url;
      link.rel = "noopener noreferrer";
      window.document.body.appendChild(link);
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

function FileDocument({ document }: { document: SerializedDocument }) {
  const t = useTranslations("Components");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const officeFile = document.mediaKind === "docx" || document.mediaKind === "xlsx";

  useEffect(() => {
    if (officeFile) return;
    let cancelled = false;
    fetch(`/api/documents/${document.id}/content`)
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
  }, [document.id, officeFile, t]);

  const label = document.fileName ?? t("resourceFile");
  if (document.mediaKind === "docx" || document.mediaKind === "xlsx") {
    return (
      <OfficeFileViewer
        src={`/api/documents/${document.id}/content?raw=1`}
        kind={document.mediaKind}
        title={document.description ?? label}
      />
    );
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!url) return <p className="text-sm text-stone-500">{t("loading")}</p>;

  if (document.mediaKind === "audio") {
    return <audio className="w-full" controls preload="metadata" src={url} />;
  }
  if (document.mediaKind === "video") {
    return (
      <video className="max-h-[32rem] w-full rounded-lg bg-black" controls preload="metadata" src={url} />
    );
  }
  if (document.mediaKind === "pdf") {
    return <PdfViewer src={url} title={document.description ?? label} />;
  }
  if (document.mediaKind === "image") {
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
          <img
            src={url}
            alt={document.description ?? label}
            className="max-h-80 w-auto object-contain"
          />
        </button>
        {viewerOpen && (
          <ImageViewer
            src={url}
            alt={document.description ?? label}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </>
    );
  }
  return (
    <a
      className="font-medium text-stone-800 underline hover:text-stone-600"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  );
}

export function DocumentCard({
  document,
  canEdit,
}: {
  document: SerializedDocument;
  canEdit: boolean;
}) {
  const t = useTranslations("Components");
  const navigation = useAppNavigation();
  const displayType = documentDisplayType(document);
  const typeLabel = t(`documentTypes.${displayType}`);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(t("deleteDocumentConfirm"))) return;
    setDeleting(true);
    setError(null);
    const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!response.ok) {
      setError(await responseError(response, t("documentDeleteError")));
      return;
    }
    navigation.returnTo(`/documents?category=${encodeURIComponent(document.category.id)}`);
  }

  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <DocumentTypeIcon type={displayType} label={typeLabel} />
          <div className="min-w-0">
            <h3 className="font-semibold text-stone-900">{document.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                {typeLabel}
              </span>
              {document.fileName && (
                <span className="text-sm font-medium">{document.fileName}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          {document.type === "FILE" && <DocumentDownloadButton document={document} />}
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
      {document.description && (
        <p className="mb-3 whitespace-pre-wrap text-sm text-stone-600">{document.description}</p>
      )}
      {document.type === "LINK" && document.url ? (
        <ResourceLink url={document.url} embed={document.embed} title={document.title} />
      ) : (
        <FileDocument document={document} />
      )}
      <FormError>{error}</FormError>
    </div>
  );
}


/** A failed file upload (shown with a translated message, not the raw status). */
class UploadFailedError extends Error {}

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
      else reject(new UploadFailedError(`Upload failed (${request.status}).`));
    };
    request.onerror = () => reject(new UploadFailedError("Upload failed."));
    request.send(file);
  });
}

export function DocumentForm({ categories }: { categories: SerializedDocumentCategory[] }) {
  const t = useTranslations("Components");
  const navigation = useAppNavigation();
  const [kind, setKind] = useState<"LINK" | "FILE">("LINK");
  const [title, setTitle] = useState("");
  const [categoryChoice, setCategoryChoice] = useState(categories[0]?.id ?? "__new__");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    let pendingDocumentId: string | null = null;
    setSaving(true);
    setError(null);
    setProgress(null);
    try {
      const category =
        categoryChoice === "__new__"
          ? { categoryName: newCategoryName }
          : { categoryId: categoryChoice };
      if (kind === "LINK") {
        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            url: withUrlScheme(url),
            description: description || undefined,
            ...category,
          }),
        });
        if (!response.ok) throw new Error(await responseError(response, t("documentCreateError")));
        const created = (await response.json()) as { document: SerializedDocument };
        navigation.returnTo(`/documents?category=${encodeURIComponent(created.document.category.id)}`);
        return;
      } else {
        if (!file) throw new Error(t("selectResourceFile"));
        const initiate = await fetch("/api/documents/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            description: description || undefined,
            ...category,
          }),
        });
        if (!initiate.ok) throw new Error(await responseError(initiate, t("documentUploadError")));
        const upload = await initiate.json();
        pendingDocumentId = upload.documentId;
        await uploadFile(upload.uploadUrl, file, upload.headers, setProgress);
        const complete = await fetch(`/api/documents/${upload.documentId}/complete`, {
          method: "POST",
        });
        if (!complete.ok) throw new Error(await responseError(complete, t("documentUploadError")));
        const created = (await complete.json()) as { document: SerializedDocument };
        pendingDocumentId = null;
        navigation.returnTo(`/documents?category=${encodeURIComponent(created.document.category.id)}`);
        return;
      }
    } catch (reason) {
      if (pendingDocumentId) {
        await fetch(`/api/documents/${pendingDocumentId}`, { method: "DELETE" }).catch(
          () => undefined,
        );
      }
      setError(
        reason instanceof UploadFailedError
          ? t("uploadFailed")
          : reason instanceof Error
            ? reason.message
            : t("documentCreateError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="document-title">{t("documentTitle")}</Label>
          <Input
            id="document-title"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div>
          <Field label={t("resourceType")}>
            <SegmentedControl
              label={t("resourceType")}
              value={kind}
              onChange={setKind}
              options={[
                { value: "LINK", label: t("resourceLink") },
                { value: "FILE", label: t("resourceFile") },
              ]}
            />
          </Field>
        </div>
        <div>
          <Label htmlFor="document-category">{t("documentCategory")}</Label>
          <Select
            id="document-category"
            className="w-full"
            value={categoryChoice}
            onChange={(event) => setCategoryChoice(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value="__new__">{t("createNewCategory")}</option>
          </Select>
        </div>
        {categoryChoice === "__new__" && (
          <div className="sm:col-span-2">
            <Label htmlFor="document-new-category">{t("newCategoryName")}</Label>
            <Input
              id="document-new-category"
              required
              maxLength={100}
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          {kind === "LINK" ? (
            <>
              <Label htmlFor="document-url">{t("resourceUrl")}</Label>
              <Input
                key="document-link"
                id="document-url"
                type="text"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://…"
              />
            </>
          ) : (
            <>
              <Label htmlFor="association-document-file">{t("resourceFile")}</Label>
              <Input
                key="document-file"
                id="association-document-file"
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
          <Label htmlFor="document-description">{t("description")}</Label>
          <Textarea
            id="document-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            placeholder={t("resourceDescriptionPlaceholder")}
          />
        </div>
      </div>
      {progress !== null && (
        <div className="mt-4">
          <p className="mb-1 text-sm text-stone-600">{t("uploadProgress", { progress })}</p>
          <div className="h-2 overflow-hidden rounded bg-stone-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-stone-800 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <FormError>{error}</FormError>
      <FormActions className="mt-4">
        <Button type="submit" disabled={saving}>
          {saving ? t("savingDocument") : t("addDocument")}
        </Button>
      </FormActions>
    </form>
  );
}

function DocumentSummary({ document }: { document: SerializedDocument }) {
  const t = useTranslations("Components");
  const displayType = documentDisplayType(document);
  return (
    <Link
      href={`/documents/${document.id}`}
      className="flex items-start gap-3 rounded-lg border border-stone-200 p-4 transition hover:bg-stone-50"
    >
      <DocumentTypeIcon type={displayType} label={t(`documentTypes.${displayType}`)} />
      <div className="min-w-0">
        <h3 className="font-semibold text-stone-900">{document.title}</h3>
        {document.description && (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-stone-600">
            {document.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export function Documents({
  documents,
  categories,
  initialCategoryId,
  title,
  titleActions,
}: {
  documents: SerializedDocument[];
  categories: SerializedDocumentCategory[];
  initialCategoryId?: string;
  /** Page title; phones show the open category's name in its place (see SectionNav). */
  title?: string;
  titleActions?: React.ReactNode;
}) {
  const t = useTranslations("Components");
  const documentSections = categories.map((category) => {
    const categoryDocuments = documents.filter(
      (document) => document.category.id === category.id,
    );
    return {
      id: category.id,
      label: category.name,
      content: (
        <Card>
          {categoryDocuments.length === 0 ? (
            <p className="text-sm text-stone-600">{t("noDocumentsInCategory")}</p>
          ) : (
            <div className="space-y-3">
              {categoryDocuments.map((document) => (
                <DocumentSummary key={document.id} document={document} />
              ))}
            </div>
          )}
        </Card>
      ),
    };
  });

  return (
    <SectionNav
      sections={documentSections}
      initialSectionId={initialCategoryId}
      sectionParam="category"
      categoriesLabel={t("documentCategories")}
      title={title}
      titleActions={titleActions}
      // Phones open the documents from the "Plus" menu.
      backHref="/more"
    />
  );
}
