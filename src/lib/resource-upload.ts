import type { ChoreographyResourceVisibility } from "@/lib/choreography-resources";

/** A failed transfer to storage (shown with a translated message, not the raw status). */
export class UploadFailedError extends Error {}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return (body?.error as string | undefined) ?? fallback;
}

/** PUT to the presigned storage URL, reporting progress (fetch cannot report upload progress). */
function uploadFile(
  uploadUrl: string,
  file: Blob,
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

type ResourceDetails = {
  choreographyId: string;
  description: string;
  visibility: ChoreographyResourceVisibility;
  /** Message when the server gives none. */
  fallbackError: string;
};

export async function createChoreographyLinkResource({
  choreographyId,
  url,
  description,
  visibility,
  fallbackError,
}: ResourceDetails & { url: string }) {
  const response = await fetch(`/api/choreographies/${choreographyId}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, description: description || undefined, visibility }),
  });
  if (!response.ok) throw new Error(await responseError(response, fallbackError));
}

/**
 * Registers the file, sends it straight to storage, then confirms it. A half-done upload is
 * removed again, so no broken resource is left behind.
 */
export async function createChoreographyFileResource({
  choreographyId,
  file,
  fileName,
  description,
  visibility,
  fallbackError,
  onProgress,
}: ResourceDetails & { file: Blob; fileName: string; onProgress: (progress: number) => void }) {
  let pendingResourceId: string | null = null;
  try {
    const initiate = await fetch(`/api/choreographies/${choreographyId}/resources/uploads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        description: description || undefined,
        visibility,
      }),
    });
    if (!initiate.ok) throw new Error(await responseError(initiate, fallbackError));
    const upload = (await initiate.json()) as {
      resourceId: string;
      uploadUrl: string;
      headers: Record<string, string>;
    };
    pendingResourceId = upload.resourceId;
    await uploadFile(upload.uploadUrl, file, upload.headers, onProgress);
    const complete = await fetch(
      `/api/choreographies/${choreographyId}/resources/${upload.resourceId}/complete`,
      { method: "POST" },
    );
    if (!complete.ok) throw new Error(await responseError(complete, fallbackError));
    pendingResourceId = null;
  } finally {
    if (pendingResourceId) {
      await fetch(`/api/choreographies/${choreographyId}/resources/${pendingResourceId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
  }
}
