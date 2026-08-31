import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { findParticipantConflicts } from "@/lib/conflicts";
import { canEditChoreography } from "@/lib/permissions";
import { rehearsalConflictSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const choreography = await prisma.choreography.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!choreography) {
    return notFound("Choreography");
  }

  const body = await request.json();
  const parsed = rehearsalConflictSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;

  if (endsAt && endsAt <= startsAt) {
    return jsonError("End time must be after start time.");
  }

  const result = await findParticipantConflicts({
    choreographyId: id,
    startsAt,
    endsAt,
    groupId: parsed.data.groupId,
  });

  if ("error" in result) {
    return jsonError(result.error);
  }

  return Response.json(result);
}
