/**
 * Shared media detection for choreography resources and association documents.
 * Add new link/file integrations here so both surfaces pick them up.
 */

export const MAX_RESOURCE_BYTES = 250 * 1024 * 1024;

export type ResourceMediaKind = "image" | "audio" | "video" | "document";

const documentMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain",
]);

const imageMimeTypes = new Set([
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isAllowedResourceMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  return (
    imageMimeTypes.has(normalized) ||
    normalized.startsWith("audio/") ||
    normalized.startsWith("video/") ||
    documentMimeTypes.has(normalized)
  );
}

export function resourceMediaKind(mimeType: string | null): ResourceMediaKind {
  if (!mimeType) return "document";
  if (imageMimeTypes.has(mimeType.toLowerCase())) return "image";
  if (mimeType.toLowerCase().startsWith("audio/")) return "audio";
  if (mimeType.toLowerCase().startsWith("video/")) return "video";
  return "document";
}

export function safeResourceFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, 180) || "file";
}

export function youtubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    let id: string | null = null;

    if (host === "youtu.be") {
      id = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (parsed.pathname === "/watch") {
        id = parsed.searchParams.get("v");
      } else {
        const [prefix, candidate] = parsed.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(prefix)) {
          id = candidate ?? null;
        }
      }
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Resolve how a LINK should be presented. Extend this when adding new URL integrations. */
export function resolveLinkPresentation(url: string): {
  youtubeId: string | null;
} {
  return { youtubeId: youtubeVideoId(url) };
}
