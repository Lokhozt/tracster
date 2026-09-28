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
  embed: ReturnType<typeof resolveLinkPresentation>;
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
    embed:
      document.type === "LINK" && document.url
        ? resolveLinkPresentation(document.url)
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

const GENERAL_DOCUMENT_CATEGORY_ID = "document-category-general";

export async function listDocumentCategories(): Promise<SerializedDocumentCategory[]> {
  const categories = await prisma.documentCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return categories.sort((left, right) => {
    if (left.id === GENERAL_DOCUMENT_CATEGORY_ID) return -1;
    if (right.id === GENERAL_DOCUMENT_CATEGORY_ID) return 1;
    return 0;
  });
}

export async function getActiveDocument(id: string) {
  const document = await prisma.document.findFirst({
    where: { id, status: "ACTIVE" },
    include: { category: { select: { id: true, name: true } } },
  });
  return document ? serializeDocument(document) : null;
}

export async function listActiveDocuments() {
  const documents = await prisma.document.findMany({
    where: { status: "ACTIVE" },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ category: { name: "asc" } }, { title: "asc" }],
  });
  return documents.map(serializeDocument);
}
