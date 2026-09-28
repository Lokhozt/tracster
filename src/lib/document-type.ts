import type { LinkEmbed } from "@/lib/resource-media";

const wordMimeTypes = new Set([
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const spreadsheetMimeTypes = new Set([
  "application/vnd.ms-excel",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

const presentationMimeTypes = new Set([
  "application/vnd.ms-powerpoint",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export type DocumentDisplayType =
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "word"
  | "spreadsheet"
  | "presentation"
  | "text"
  | "youtube"
  | "spotify"
  | "google-document"
  | "google-spreadsheet"
  | "google-presentation"
  | "whatsapp"
  | "link"
  | "file";

export function documentDisplayType(document: {
  type: "LINK" | "FILE";
  mimeType: string | null;
  url: string | null;
  embed: LinkEmbed | null;
}): DocumentDisplayType {
  if (document.type === "LINK") {
    if (document.embed?.provider === "youtube") return "youtube";
    if (document.embed?.provider === "spotify") return "spotify";
    if (document.embed?.provider === "whatsapp") return "whatsapp";
    if (document.embed?.provider === "google") return googleDisplayType(document.url);
    return "link";
  }

  const mimeType = document.mimeType?.toLowerCase() ?? "";
  if (mimeType === "application/pdf") return "pdf";
  if (wordMimeTypes.has(mimeType)) return "word";
  if (spreadsheetMimeTypes.has(mimeType)) return "spreadsheet";
  if (presentationMimeTypes.has(mimeType)) return "presentation";
  if (mimeType === "text/plain") return "text";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

function googleDisplayType(url: string | null): DocumentDisplayType {
  if (!url) return "google-document";
  try {
    const [kind] = new URL(url).pathname.split("/").filter(Boolean);
    if (kind === "spreadsheets") return "google-spreadsheet";
    if (kind === "presentation") return "google-presentation";
  } catch {
    return "google-document";
  }
  return "google-document";
}
