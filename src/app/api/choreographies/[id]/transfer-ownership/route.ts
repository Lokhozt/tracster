import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canTransferChoreographyOwnership } from "@/lib/permissions";
import { assignUserSchema } from "@/lib/validations";
import { basicUserSelect } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  if (!(await canTransferChoreographyOwnership(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = assignUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const choreography = await prisma.choreography.findUnique({
    where: { id },
    select: { createdById: true, archivedAt: true },
  });
  if (!choreography || choreography.archivedAt) {
    return notFound("Choreography");
  }

  if (parsed.data.userId === choreography.createdById) {
    return jsonError("Choose a different user to transfer ownership to.");
  }

  const assignment = await prisma.choreographyChoreographer.findUnique({
    where: {
      choreographyId_userId: {
        choreographyId: id,
        userId: parsed.data.userId,
      },
    },
  });
  if (!assignment) {
    return jsonError("Ownership can only be transferred to a choreographer on this piece.");
  }

  const updated = await prisma.choreography.update({
    where: { id },
    data: { createdById: parsed.data.userId },
    select: {
      id: true,
      createdById: true,
      createdBy: { select: basicUserSelect },
    },
  });

  return Response.json({ choreography: updated });
}
