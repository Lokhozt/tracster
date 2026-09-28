/**
 * Shared media detection for choreography resources and association documents.
 * Add new link/file integrations here so both surfaces pick them up.
 */

export const MAX_RESOURCE_BYTES = 250 * 1024 * 1024;

export type ResourceMediaKind = "image" | "audio" | "video" | "pdf" | "docx" | "xlsx" | "document";

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
  const normalized = mimeType.toLowerCase();
  if (normalized === "application/pdf") return "pdf";
  if (normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx";
  }
  if (normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return "xlsx";
  }
  if (imageMimeTypes.has(normalized)) return "image";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.startsWith("video/")) return "video";
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

export type LinkEmbed =
  | { provider: "youtube"; src: string }
  | { provider: "spotify"; src: string; height: number }
  | { provider: "google"; src: string };

const spotifyTypes = new Set(["track", "album", "playlist", "episode", "show", "artist"]);

function spotifyEmbed(url: URL): Extract<LinkEmbed, { provider: "spotify" }> | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "open.spotify.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  let type: string | undefined;
  let id: string | undefined;
  if (parts[0] === "embed" && spotifyTypes.has(parts[1] ?? "")) {
    type = parts[1];
    id = parts[2];
  } else if (parts[0]?.startsWith("intl-") && spotifyTypes.has(parts[1] ?? "")) {
    type = parts[1];
    id = parts[2];
  } else if (spotifyTypes.has(parts[0] ?? "")) {
    type = parts[0];
    id = parts[1];
  }

  if (!type || !id || !/^[A-Za-z0-9]{22}$/.test(id)) return null;
  const compact = type === "track" || type === "episode";
  return {
    provider: "spotify",
    src: `https://open.spotify.com/embed/${type}/${id}`,
    height: compact ? 152 : 352,
  };
}

function googleDocsEmbed(url: URL): Extract<LinkEmbed, { provider: "google" }> | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "docs.google.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const kind = parts[0];
  if (kind !== "document" && kind !== "spreadsheets" && kind !== "presentation") {
    return null;
  }

  const marker = parts.indexOf("d");
  if (marker < 0) return null;
  const published = parts[marker + 1] === "e";
  const id = published ? parts[marker + 2] : parts[marker + 1];
  if (!id || !/^[A-Za-z0-9_-]{10,}$/.test(id)) return null;

  if (published) {
    if (kind === "document") {
      return { provider: "google", src: `https://docs.google.com/document/d/e/${id}/pub?embedded=true` };
    }
    if (kind === "spreadsheets") {
      return {
        provider: "google",
        src: `https://docs.google.com/spreadsheets/d/e/${id}/pubhtml?widget=true&headers=false`,
      };
    }
    return { provider: "google", src: `https://docs.google.com/presentation/d/e/${id}/embed` };
  }

  if (kind === "document") {
    return { provider: "google", src: `https://docs.google.com/document/d/${id}/preview` };
  }
  if (kind === "spreadsheets") {
    return { provider: "google", src: `https://docs.google.com/spreadsheets/d/${id}/preview` };
  }
  return { provider: "google", src: `https://docs.google.com/presentation/d/${id}/embed` };
}

/** Resolve how a LINK should be presented. Extend this when adding new URL integrations. */
export function resolveLinkPresentation(url: string): LinkEmbed | null {
  const youtubeId = youtubeVideoId(url);
  if (youtubeId) {
    return { provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${youtubeId}` };
  }

  try {
    const parsed = new URL(url);
    return spotifyEmbed(parsed) ?? googleDocsEmbed(parsed);
  } catch {
    return null;
  }
}
