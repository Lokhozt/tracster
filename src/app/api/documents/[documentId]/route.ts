import { NextRequest } from "next/server";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { canManageDocuments } from "@/lib/documents";
import { prisma } from "@/lib/db";
import { deleteChoreographyResourceObjects } from "@/lib/s3";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!(await canManageDocuments(user.id))) return forbidden();

  const { documentId } = await context.params;
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, storageKey: true },
  });
  if (!document) return notFound("Document");

  if (document.storageKey) {
    try {
      await deleteChoreographyResourceObjects([document.storageKey]);
    } catch {
      return jsonError("The resource file could not be deleted.", 503);
    }
  }
  await prisma.document.delete({ where: { id: document.id } });
  return Response.json({ ok: true });
}
