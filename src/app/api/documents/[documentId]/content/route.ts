import { NextRequest } from "next/server";
import { jsonError, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createChoreographyResourceDownloadUrl, openStoredObject } from "@/lib/s3";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { documentId } = await context.params;
  const document = await prisma.document.findFirst({
    where: { id: documentId, type: "FILE", status: "ACTIVE" },
  });
  if (!document) return notFound("Document");
  if (!document.storageKey || !document.fileName || !document.mimeType) {
    return jsonError("Invalid file resource.", 409);
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  if (request.nextUrl.searchParams.get("raw") === "1") {
    try {
      const safeFileName = document.fileName.replace(/["\\]/g, "_");
      return new Response(await openStoredObject(document.storageKey), {
        headers: {
          "Content-Type": document.mimeType,
          "Content-Disposition": `inline; filename="${safeFileName}"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return jsonError("File storage is unavailable.", 503);
    }
  }

  try {
    return Response.json({
      url: await createChoreographyResourceDownloadUrl({
        key: document.storageKey,
        fileName: document.fileName,
        mimeType: document.mimeType,
        disposition: download ? "attachment" : "inline",
      }),
    });
  } catch {
    return jsonError("File storage is unavailable.", 503);
  }
}
