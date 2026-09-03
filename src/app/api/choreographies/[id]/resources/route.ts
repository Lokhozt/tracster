import { NextRequest } from "next/server";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  getVisibleChoreographyResources,
  serializeChoreographyResource,
} from "@/lib/choreography-resources";
import { prisma } from "@/lib/db";
import {
  canEditChoreography,
  canViewChoreography,
} from "@/lib/permissions";
import { choreographyResourceLinkSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await canViewChoreography(id, user.id))) return forbidden();

  return Response.json({
    resources: await getVisibleChoreographyResources(id, user.id),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await canEditChoreography(id, user.id))) return forbidden();

  const parsed = choreographyResourceLinkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const resource = await prisma.choreographyResource.create({
    data: {
      choreographyId: id,
      uploadedById: user.id,
      type: "LINK",
      visibility: parsed.data.visibility,
      description: parsed.data.description || null,
      url: parsed.data.url,
    },
  });

  return Response.json(
    { resource: serializeChoreographyResource(resource) },
    { status: 201 },
  );
}
