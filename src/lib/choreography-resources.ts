import { prisma } from "@/lib/db";
import {
  canEditChoreography,
  canViewChoreography,
  isChoreographyMember,
} from "@/lib/permissions";
import {
  isAllowedResourceMimeType,
  isVideoResource,
  MAX_RESOURCE_BYTES,
  resolveLinkPresentation,
  resourceMediaKind,
  safeResourceFileName,
  youtubeVideoId,
  type ResourceMediaKind,
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

type ChoreographyResourceViewer = {
  canEdit: boolean;
  canView: boolean;
  isMember: boolean;
};

async function loadChoreographyResourceViewer(
  choreographyId: string,
  userId: string,
): Promise<ChoreographyResourceViewer> {
  const [canEdit, canView, isMember] = await Promise.all([
    canEditChoreography(choreographyId, userId),
    canViewChoreography(choreographyId, userId),
    isChoreographyMember(choreographyId, userId),
  ]);
  return { canEdit, canView, isMember };
}

function isResourceVisibleTo(
  visibility: ChoreographyResourceVisibility,
  viewer: ChoreographyResourceViewer,
) {
  if (viewer.canEdit) return true;
  if (visibility === "CHOREOGRAPHER") return false;
  if (!viewer.canView) return false;
  if (visibility === "ALL") return true;
  return viewer.isMember;
}

export async function canViewChoreographyResource(
  choreographyId: string,
  userId: string,
  visibility: ChoreographyResourceVisibility,
) {
  return isResourceVisibleTo(
    visibility,
    await loadChoreographyResourceViewer(choreographyId, userId),
  );
}

export type SerializedChoreographyResource = {
  id: string;
  type: "LINK" | "FILE";
  pinned: boolean;
  visibility: ChoreographyResourceVisibility;
  description: string | null;
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  mediaKind: ResourceMediaKind;
  embed: ReturnType<typeof resolveLinkPresentation>;
  createdAt: string;
};

export function serializeChoreographyResource(resource: {
  id: string;
  type: "LINK" | "FILE";
  pinned: boolean;
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
    pinned: resource.pinned,
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
  const [resources, viewer] = await Promise.all([
    prisma.choreographyResource.findMany({
      where: { choreographyId, status: "ACTIVE" },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    }),
    loadChoreographyResourceViewer(choreographyId, userId),
  ]);
  return resources
    .filter((resource) => isResourceVisibleTo(resource.visibility, viewer))
    .map(serializeChoreographyResource);
}

export type ChoreographyVideo = {
  choreography: { id: string; title: string };
  resource: SerializedChoreographyResource;
};

/**
 * "My videos": the pinned videos of every choreography the user takes part in (creator,
 * choreographer or participant), newest first. Choreographers pick them by pinning, which keeps
 * the quick access short. Admins only get their own choreographies here too.
 */
export async function getMyChoreographyVideos(userId: string): Promise<ChoreographyVideo[]> {
  const choreographies = await prisma.choreography.findMany({
    where: {
      archivedAt: null,
      OR: [
        { createdById: userId },
        { choreographers: { some: { userId } } },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true, title: true },
  });
  const videosByChoreography = await Promise.all(
    choreographies.map(async (choreography) =>
      (await getVisibleChoreographyResources(choreography.id, userId))
        .filter((resource) => resource.pinned && isVideoResource(resource))
        .map((resource) => ({ choreography, resource })),
    ),
  );
  return videosByChoreography
    .flat()
    .sort((left, right) => right.resource.createdAt.localeCompare(left.resource.createdAt));
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
