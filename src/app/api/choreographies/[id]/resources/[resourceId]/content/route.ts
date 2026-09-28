import { NextRequest } from "next/server";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { canViewChoreographyResource } from "@/lib/choreography-resources";
import { prisma } from "@/lib/db";
import { createChoreographyResourceDownloadUrl, openStoredObject } from "@/lib/s3";

type RouteContext = {
  params: Promise<{ id: string; resourceId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id, resourceId } = await context.params;

  const resource = await prisma.choreographyResource.findFirst({
    where: {
      id: resourceId,
      choreographyId: id,
      type: "FILE",
      status: "ACTIVE",
    },
  });
  if (!resource) return notFound("Resource");
  if (!(await canViewChoreographyResource(id, user.id, resource.visibility))) {
    return forbidden();
  }
  if (!resource.storageKey || !resource.fileName || !resource.mimeType) {
    return jsonError("Invalid file resource.", 409);
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  if (request.nextUrl.searchParams.get("raw") === "1") {
    try {
      const safeFileName = resource.fileName.replace(/["\\]/g, "_");
      return new Response(await openStoredObject(resource.storageKey), {
        headers: {
          "Content-Type": resource.mimeType,
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
        key: resource.storageKey,
        fileName: resource.fileName,
        mimeType: resource.mimeType,
        disposition: download ? "attachment" : "inline",
      }),
    });
  } catch {
    return jsonError("File storage is unavailable.", 503);
  }
}
