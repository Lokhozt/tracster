import { NextRequest } from "next/server";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { canManageDocuments, serializeDocument } from "@/lib/documents";
import { prisma } from "@/lib/db";
import {
  isAllowedResourceMimeType,
  MAX_RESOURCE_BYTES,
} from "@/lib/resource-media";
import {
  deleteChoreographyResourceObjects,
  headChoreographyResourceObject,
} from "@/lib/s3";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!(await canManageDocuments(user.id))) return forbidden();

  const { documentId } = await context.params;
  const document = await prisma.document.findFirst({
    where: { id: documentId, type: "FILE" },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!document) return notFound("Document");
  if (document.status === "ACTIVE") {
    return Response.json({ document: serializeDocument(document) });
  }
  if (!document.storageKey || !document.mimeType || document.sizeBytes === null) {
    return jsonError("Invalid file resource.", 409);
  }

  let object;
  try {
    object = await headChoreographyResourceObject(document.storageKey);
  } catch {
    return jsonError("The uploaded file could not be found.", 409);
  }

  const valid =
    object.contentLength === Number(document.sizeBytes) &&
    object.contentLength <= MAX_RESOURCE_BYTES &&
    object.contentType.toLowerCase() === document.mimeType.toLowerCase() &&
    isAllowedResourceMimeType(object.contentType);

  if (!valid) {
    try {
      await deleteChoreographyResourceObjects([document.storageKey]);
    } catch {
      return jsonError("The invalid resource file could not be deleted.", 503);
    }
    await prisma.document.delete({ where: { id: document.id } });
    return jsonError("The uploaded file did not match the requested file.", 409);
  }

  const completed = await prisma.document.update({
    where: { id: document.id },
    data: { status: "ACTIVE" },
    include: { category: { select: { id: true, name: true } } },
  });
  return Response.json({ document: serializeDocument(completed) });
}
