import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { intervalsOverlap } from "@/lib/conflicts";
import { getEventTypeByKind } from "@/lib/event-types";
import { getGroupForChoreography } from "@/lib/groups";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { resolveLocationFromParsed } from "@/lib/locations";
import { isAdmin } from "@/lib/roles";
import { schedulingApplySchema } from "@/lib/validations";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";

async function findAttendeeUnavailability(
  attendeeIds: string[],
  placements: Array<{ startsAt: string; endsAt: string }>,
) {
  const uniqueIds = [...new Set(attendeeIds)];
  if (uniqueIds.length === 0) {
    return [];
  }

  const starts = placements.map((placement) => new Date(placement.startsAt).getTime());
  const ends = placements.map((placement) => new Date(placement.endsAt).getTime());

  return prisma.userUnavailability.findMany({
    where: {
      userId: { in: uniqueIds },
      startsAt: { lt: new Date(Math.max(...ends)) },
      endsAt: { gt: new Date(Math.min(...starts)) },
    },
    select: { userId: true, startsAt: true, endsAt: true },
  });
}

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

  const attendeeIdsByPlacement: string[][] = [];

  for (const placement of parsed.data.placements) {
    const startsAt = new Date(placement.startsAt);
    const endsAt = new Date(placement.endsAt);
    if (endsAt <= startsAt) {
      return jsonError("Each rehearsal must end after it starts.");
    }

    const choreography = await prisma.choreography.findFirst({
      where: { id: placement.choreographyId, ...visibleChoreographyWhere },
      select: {
        id: true,
        choreographers: { select: { userId: true } },
        members: { select: { userId: true } },
      },
    });
    if (!choreography) {
      return jsonError("One of the selected choreographies was not found.");
    }

    let memberIds = choreography.members.map((member) => member.userId);
    if (placement.groupId) {
      const group = await getGroupForChoreography(placement.choreographyId, placement.groupId);
      if (!group) {
        return jsonError("Selected group does not belong to this choreography.");
      }
      memberIds = group.members.map((member) => member.userId);
    }

    const location = await resolveLocationFromParsed({ locationId: placement.locationId });
    if ("error" in location) {
      return jsonError(location.error);
    }

    attendeeIdsByPlacement.push([
      ...new Set([
        ...memberIds,
        ...choreography.choreographers.map((entry) => entry.userId),
      ]),
    ]);
  }

  const unavailability = await findAttendeeUnavailability(
    attendeeIdsByPlacement.flat(),
    parsed.data.placements,
  );

  const created = await prisma.$transaction(async (tx) => {
    const events: Array<{ id: string; startsAt: Date; choreographyId: string | null }> = [];

    for (const [index, placement] of parsed.data.placements.entries()) {
      const startsAt = new Date(placement.startsAt);
      const endsAt = new Date(placement.endsAt);

      const event = await tx.event.create({
        data: {
          typeId: eventType.id,
          choreographyId: placement.choreographyId,
          groupId: placement.groupId ?? null,
          createdById: user.id,
          startsAt,
          endsAt,
          locationId: placement.locationId,
          location: null,
        },
        select: { id: true, startsAt: true, choreographyId: true },
      });
      events.push(event);

      const responses = attendeeIdsByPlacement[index].map((userId) => ({
        eventId: event.id,
        userId,
        status: unavailability.some(
          (entry) =>
            entry.userId === userId &&
            intervalsOverlap(startsAt, endsAt, entry.startsAt, entry.endsAt),
        )
          ? ("UNAVAILABLE" as const)
          : ("AVAILABLE" as const),
      }));

      if (responses.length > 0) {
        await tx.availabilityResponse.createMany({ data: responses });
      }
    }

    return events;
  }, { timeout: 20_000 });
  await Promise.all(created.map(({ id }) => syncGoogleEventBestEffort(id)));

  return Response.json({ rehearsals: created }, { status: 201 });
}
