import { prisma } from "@/lib/db";
import {
  resolveLinkPresentation,
  resourceMediaKind,
} from "@/lib/resource-media";
import { canManageDocuments } from "@/lib/roles";

export { canManageDocuments };

export type SerializedDocumentCategory = {
  id: string;
  name: string;
};

export type SerializedDocument = {
  id: string;
  title: string;
  category: SerializedDocumentCategory;
  type: "LINK" | "FILE";
  description: string | null;
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  mediaKind: "image" | "audio" | "video" | "document";
  youtubeId: string | null;
  createdAt: string;
};

export function serializeDocument(document: {
  id: string;
  title: string;
  category: SerializedDocumentCategory;
  type: "LINK" | "FILE";
  description: string | null;
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: bigint | null;
  createdAt: Date;
}): SerializedDocument {
  return {
    id: document.id,
    title: document.title,
    category: document.category,
    type: document.type,
    description: document.description,
    url: document.url,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes === null ? null : Number(document.sizeBytes),
    mediaKind: resourceMediaKind(document.mimeType),
    youtubeId:
      document.type === "LINK" && document.url
        ? resolveLinkPresentation(document.url).youtubeId
        : null,
    createdAt: document.createdAt.toISOString(),
  };
}

function normalizeCategoryName(name: string) {
  return name.normalize("NFKC").toLocaleLowerCase("en-US");
}

export async function resolveDocumentCategory(options: {
  categoryId?: string;
  categoryName?: string;
}) {
  if (options.categoryName) {
    const name = options.categoryName.trim();
    return prisma.documentCategory.upsert({
      where: { normalizedName: normalizeCategoryName(name) },
      update: {},
      create: { name, normalizedName: normalizeCategoryName(name) },
      select: { id: true },
    });
  }
  if (!options.categoryId) return null;
  return prisma.documentCategory.findUnique({
    where: { id: options.categoryId },
    select: { id: true },
  });
}

export async function listDocumentCategories(): Promise<SerializedDocumentCategory[]> {
  return prisma.documentCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listActiveDocuments() {
  const documents = await prisma.document.findMany({
    where: { status: "ACTIVE" },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ category: { name: "asc" } }, { title: "asc" }],
  });
  return documents.map(serializeDocument);
}
