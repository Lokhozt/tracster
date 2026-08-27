import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { getGroupForChoreography } from "@/lib/groups";
import { canEditChoreography } from "@/lib/permissions";
import { basicUserSelect } from "@/lib/users";
import { repetitionSchema } from "@/lib/validations";
import { resolveLocationFromParsed } from "@/lib/locations";
import { getEventTypeByKind } from "@/lib/event-types";

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

  const choreography = await prisma.choreography.findUnique({ where: { id } });
  if (!choreography) {
    return notFound("Choreography");
  }

  const body = await request.json();
  const parsed = repetitionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  if (parsed.data.groupId) {
    const group = await getGroupForChoreography(id, parsed.data.groupId);
    if (!group) {
      return jsonError("Selected group does not belong to this choreography.");
    }
  }

  const location = await resolveLocationFromParsed(parsed.data);
  if ("error" in location) {
    return jsonError(location.error);
  }

  const eventType = await getEventTypeByKind("REPETITION");
  if (!eventType) {
    return jsonError("Repetition event type is not configured.");
  }

  const repetition = await prisma.event.create({
    data: {
      typeId: eventType.id,
      choreographyId: id,
      groupId: parsed.data.groupId ?? null,
      createdById: user.id,
      title: parsed.data.title ?? "",
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      locationId: location.locationId,
      location: location.location,
      notes: parsed.data.notes,
    },
    include: {
      group: { select: { id: true, name: true } },
      availabilities: {
        include: { user: { select: basicUserSelect } },
      },
    },
  });

  return Response.json({ repetition, event: repetition }, { status: 201 });
}
