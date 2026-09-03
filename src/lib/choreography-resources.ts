import { prisma } from "@/lib/db";
import {
  canEditChoreography,
  canViewChoreography,
  isChoreographyMember,
} from "@/lib/permissions";
import { deleteChoreographyResourceObjects } from "@/lib/s3";

export const MAX_CHOREOGRAPHY_RESOURCE_BYTES = 250 * 1024 * 1024;

export class ChoreographyResourceCleanupError extends Error {}

export type ChoreographyResourceVisibility =
  | "CHOREOGRAPHER"
  | "PARTICIPANT"
  | "ALL";

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

export function isAllowedChoreographyResourceMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  return (
    imageMimeTypes.has(normalized) ||
    normalized.startsWith("audio/") ||
    normalized.startsWith("video/") ||
    documentMimeTypes.has(normalized)
  );
}

export function choreographyResourceMediaKind(mimeType: string | null) {
  if (!mimeType) return "document" as const;
  if (imageMimeTypes.has(mimeType.toLowerCase())) return "image" as const;
  if (mimeType.toLowerCase().startsWith("audio/")) return "audio" as const;
  if (mimeType.toLowerCase().startsWith("video/")) return "video" as const;
  return "document" as const;
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

export async function canViewChoreographyResource(
  choreographyId: string,
  userId: string,
  visibility: ChoreographyResourceVisibility,
) {
  if (await canEditChoreography(choreographyId, userId)) return true;
  if (visibility === "CHOREOGRAPHER") return false;
  if (!(await canViewChoreography(choreographyId, userId))) return false;
  if (visibility === "ALL") return true;
  return isChoreographyMember(choreographyId, userId);
}

export type SerializedChoreographyResource = {
  id: string;
  type: "LINK" | "FILE";
  visibility: ChoreographyResourceVisibility;
  description: string | null;
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  mediaKind: "image" | "audio" | "video" | "document";
  youtubeId: string | null;
  createdAt: string;
};

export function serializeChoreographyResource(resource: {
  id: string;
  type: "LINK" | "FILE";
  visibility: ChoreographyResourceVisibility;
  description: string | null;
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: bigint | null;
  createdAt: Date;
}): SerializedChoreographyResource {
  return {
    id: resource.id,
    type: resource.type,
    visibility: resource.visibility,
    description: resource.description,
    url: resource.url,
    fileName: resource.fileName,
    mimeType: resource.mimeType,
    sizeBytes: resource.sizeBytes === null ? null : Number(resource.sizeBytes),
    mediaKind: choreographyResourceMediaKind(resource.mimeType),
    youtubeId:
      resource.type === "LINK" && resource.url
        ? youtubeVideoId(resource.url)
        : null,
    createdAt: resource.createdAt.toISOString(),
  };
}

export async function getVisibleChoreographyResources(
  choreographyId: string,
  userId: string,
) {
  const resources = await prisma.choreographyResource.findMany({
    where: { choreographyId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  const visible = await Promise.all(
    resources.map(async (resource) =>
      (await canViewChoreographyResource(
        choreographyId,
        userId,
        resource.visibility,
      ))
        ? serializeChoreographyResource(resource)
        : null,
    ),
  );
  return visible.filter((resource) => resource !== null);
}

export async function deleteChoreographyResourceFiles(choreographyId: string) {
  const resources = await prisma.choreographyResource.findMany({
    where: { choreographyId, storageKey: { not: null } },
    select: { storageKey: true },
  });
  try {
    await deleteChoreographyResourceObjects(
      resources.flatMap((resource) =>
        resource.storageKey ? [resource.storageKey] : [],
      ),
    );
  } catch {
    throw new ChoreographyResourceCleanupError(
      "Choreography resource files could not be deleted.",
    );
  }
}
