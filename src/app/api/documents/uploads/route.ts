import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { canManageDocuments, resolveDocumentCategory } from "@/lib/documents";
import { prisma } from "@/lib/db";
import { isAllowedResourceMimeType, safeResourceFileName } from "@/lib/resource-media";
import {
  createChoreographyResourceUploadUrl,
  documentObjectKey,
} from "@/lib/s3";
import { documentUploadSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!(await canManageDocuments(user.id))) return forbidden();

  const parsed = documentUploadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  if (!isAllowedResourceMimeType(parsed.data.mimeType)) {
    return jsonError("This file type is not supported.");
  }
  const category = await resolveDocumentCategory(parsed.data);
  if (!category) return jsonError("Choose a valid document category.");

  const documentId = randomUUID();
  const fileName = safeResourceFileName(parsed.data.fileName);
  const storageKey = documentObjectKey(documentId, fileName);

  await prisma.document.create({
    data: {
      id: documentId,
      uploadedById: user.id,
      categoryId: category.id,
      type: "FILE",
      status: "PENDING",
      title: parsed.data.title,
      description: parsed.data.description || null,
      storageKey,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: BigInt(parsed.data.sizeBytes),
    },
  });

  try {
    const uploadUrl = await createChoreographyResourceUploadUrl({
      key: storageKey,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
    });
    return Response.json(
      {
        documentId,
        uploadUrl,
        headers: { "Content-Type": parsed.data.mimeType },
      },
      { status: 201 },
    );
  } catch {
    await prisma.document.delete({ where: { id: documentId } });
    return jsonError("File storage is unavailable.", 503);
  }
}
