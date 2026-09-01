import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { getEventTypeByKind } from "@/lib/event-types";
import { getGroupForChoreography } from "@/lib/groups";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { resolveLocationFromParsed } from "@/lib/locations";
import { isAdmin } from "@/lib/roles";
import { schedulingApplySchema } from "@/lib/validations";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isAdmin(user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = schedulingApplySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const eventType = await getEventTypeByKind("REHEARSAL");
  if (!eventType) {
    return jsonError("Rehearsal event type is not configured.");
  }

  for (const placement of parsed.data.placements) {
    const startsAt = new Date(placement.startsAt);
    const endsAt = new Date(placement.endsAt);
    if (endsAt <= startsAt) {
      return jsonError("Each rehearsal must end after it starts.");
    }

    const choreography = await prisma.choreography.findFirst({
      where: { id: placement.choreographyId, ...visibleChoreographyWhere },
      select: { id: true },
    });
    if (!choreography) {
      return jsonError("One of the selected choreographies was not found.");
    }

    if (placement.groupId) {
      const group = await getGroupForChoreography(placement.choreographyId, placement.groupId);
      if (!group) {
        return jsonError("Selected group does not belong to this choreography.");
      }
    }

    const location = await resolveLocationFromParsed({ locationId: placement.locationId });
    if ("error" in location) {
      return jsonError(location.error);
    }
  }

  const created = await prisma.$transaction(
    parsed.data.placements.map((placement) =>
      prisma.event.create({
        data: {
          typeId: eventType.id,
          choreographyId: placement.choreographyId,
          groupId: placement.groupId ?? null,
          createdById: user.id,
          startsAt: new Date(placement.startsAt),
          endsAt: new Date(placement.endsAt),
          locationId: placement.locationId,
          location: null,
        },
        select: { id: true, startsAt: true, choreographyId: true },
      }),
    ),
  );
  await Promise.all(created.map(({ id }) => syncGoogleEventBestEffort(id)));

  return Response.json({ rehearsals: created }, { status: 201 });
}
