import { NextRequest } from "next/server";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { serializeChoreographyResource } from "@/lib/choreography-resources";
import { prisma } from "@/lib/db";
import { canEditChoreography } from "@/lib/permissions";
import { deleteChoreographyResourceObjects } from "@/lib/s3";
import { choreographyResourceUpdateSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string; resourceId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id, resourceId } = await context.params;
  if (!(await canEditChoreography(id, user.id))) return forbidden();

  const parsed = choreographyResourceUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const resource = await prisma.choreographyResource.findFirst({
    where: { id: resourceId, choreographyId: id, status: "ACTIVE" },
  });
  if (!resource) return notFound("Resource");

  const { pinned, description, visibility, url } = parsed.data;
  if (url !== undefined && resource.type !== "LINK") {
    return jsonError("Only link resources have a URL.");
  }

  const updated = await prisma.choreographyResource.update({
    where: { id: resource.id },
    data: {
      ...(pinned !== undefined ? { pinned } : {}),
      // An emptied description is stored as null, like on creation.
      ...(description !== undefined ? { description: description || null } : {}),
      ...(visibility !== undefined ? { visibility } : {}),
      ...(url !== undefined ? { url } : {}),
    },
  });
  return Response.json({ resource: serializeChoreographyResource(updated) });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id, resourceId } = await context.params;
  if (!(await canEditChoreography(id, user.id))) return forbidden();

  const resource = await prisma.choreographyResource.findFirst({
    where: { id: resourceId, choreographyId: id },
    select: { id: true, storageKey: true },
  });
  if (!resource) return notFound("Resource");

  if (resource.storageKey) {
    try {
      await deleteChoreographyResourceObjects([resource.storageKey]);
    } catch {
      return jsonError("The resource file could not be deleted.", 503);
    }
  }
  await prisma.choreographyResource.delete({ where: { id: resource.id } });
  return Response.json({ ok: true });
}
