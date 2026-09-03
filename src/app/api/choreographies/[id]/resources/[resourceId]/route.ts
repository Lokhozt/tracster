import { NextRequest } from "next/server";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditChoreography } from "@/lib/permissions";
import { deleteChoreographyResourceObjects } from "@/lib/s3";

type RouteContext = {
  params: Promise<{ id: string; resourceId: string }>;
};

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
