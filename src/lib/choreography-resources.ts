import { prisma } from "@/lib/db";
import {
  canEditChoreography,
  canViewChoreography,
  isChoreographyMember,
} from "@/lib/permissions";
import {
  isAllowedResourceMimeType,
  MAX_RESOURCE_BYTES,
  resolveLinkPresentation,
  resourceMediaKind,
  safeResourceFileName,
  youtubeVideoId,
} from "@/lib/resource-media";
import { deleteChoreographyResourceObjects } from "@/lib/s3";

export const MAX_CHOREOGRAPHY_RESOURCE_BYTES = MAX_RESOURCE_BYTES;

export {
  isAllowedResourceMimeType as isAllowedChoreographyResourceMimeType,
  resourceMediaKind as choreographyResourceMediaKind,
  safeResourceFileName,
  youtubeVideoId,
};

export class ChoreographyResourceCleanupError extends Error {}

export type ChoreographyResourceVisibility =
  | "CHOREOGRAPHER"
  | "PARTICIPANT"
  | "ALL";

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
  embed: ReturnType<typeof resolveLinkPresentation>;
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
    mediaKind: resourceMediaKind(resource.mimeType),
    embed:
      resource.type === "LINK" && resource.url
        ? resolveLinkPresentation(resource.url)
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
