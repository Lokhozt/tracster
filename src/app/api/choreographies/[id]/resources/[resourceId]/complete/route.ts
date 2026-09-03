import { NextRequest } from "next/server";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  isAllowedChoreographyResourceMimeType,
  MAX_CHOREOGRAPHY_RESOURCE_BYTES,
  serializeChoreographyResource,
} from "@/lib/choreography-resources";
import { prisma } from "@/lib/db";
import { canEditChoreography } from "@/lib/permissions";
import {
  deleteChoreographyResourceObjects,
  headChoreographyResourceObject,
} from "@/lib/s3";

type RouteContext = {
  params: Promise<{ id: string; resourceId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id, resourceId } = await context.params;
  if (!(await canEditChoreography(id, user.id))) return forbidden();

  const resource = await prisma.choreographyResource.findFirst({
    where: { id: resourceId, choreographyId: id, type: "FILE" },
  });
  if (!resource) return notFound("Resource");
  if (resource.status === "ACTIVE") {
    return Response.json({ resource: serializeChoreographyResource(resource) });
  }
  if (!resource.storageKey || !resource.mimeType || resource.sizeBytes === null) {
    return jsonError("Invalid file resource.", 409);
  }

  let object;
  try {
    object = await headChoreographyResourceObject(resource.storageKey);
  } catch {
    return jsonError("The uploaded file could not be found.", 409);
  }

  const valid =
    object.contentLength === Number(resource.sizeBytes) &&
    object.contentLength <= MAX_CHOREOGRAPHY_RESOURCE_BYTES &&
    object.contentType.toLowerCase() === resource.mimeType.toLowerCase() &&
    isAllowedChoreographyResourceMimeType(object.contentType);

  if (!valid) {
    try {
      await deleteChoreographyResourceObjects([resource.storageKey]);
    } catch {
      return jsonError("The invalid resource file could not be deleted.", 503);
    }
    await prisma.choreographyResource.delete({ where: { id: resource.id } });
    return jsonError("The uploaded file did not match the requested file.", 409);
  }

  const completed = await prisma.choreographyResource.update({
    where: { id: resource.id },
    data: { status: "ACTIVE" },
  });
  return Response.json({ resource: serializeChoreographyResource(completed) });
}
