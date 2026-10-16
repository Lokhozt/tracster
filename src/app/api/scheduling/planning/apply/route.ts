import { NextRequest } from "next/server";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { type LocationAssignment, resolveLocationFromParsed } from "@/lib/locations";
import { isAdmin } from "@/lib/roles";
import { loadPlanningRehearsalPlacements } from "@/lib/scheduling/planning-load";
import { schedulingPlanningApplySchema } from "@/lib/validations";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  if (!(await isAdmin(user.id))) {
    return forbidden();
  }

  const parsed = schedulingPlanningApplySchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const loaded = await loadPlanningRehearsalPlacements(
    parsed.data.startDate,
    parsed.data.endDate,
  );
  if ("error" in loaded) {
    return jsonError(loaded.error);
  }

  const editableIds = new Set(loaded.placements.map((placement) => placement.itemId));
  const submittedIds = new Set(parsed.data.placements.map((placement) => placement.eventId));
  if (submittedIds.size !== editableIds.size) {
    return jsonError("Submitted rehearsals do not match the selected period.");
  }
  for (const id of editableIds) {
    if (!submittedIds.has(id)) {
      return jsonError("Submitted rehearsals do not match the selected period.");
    }
  }

  const existing = await prisma.event.findMany({
    where: { id: { in: [...editableIds] } },
    select: {
      id: true,
      choreographyId: true,
      groupId: true,
      type: { select: { kind: true } },
    },
  });
  if (existing.length !== editableIds.size) {
    return jsonError("One of the selected rehearsals was not found.");
  }
  const existingById = new Map(existing.map((event) => [event.id, event]));

  const resolvedLocations: LocationAssignment[] = [];
  for (const placement of parsed.data.placements) {
    const startsAt = new Date(placement.startsAt);
    const endsAt = new Date(placement.endsAt);
    if (endsAt <= startsAt) {
      return jsonError("Each rehearsal must end after it starts.");
    }

    const record = existingById.get(placement.eventId);
    if (!record || record.type.kind !== "REHEARSAL") {
      return jsonError("One of the selected rehearsals was not found.");
    }
    if (record.choreographyId !== placement.choreographyId) {
      return jsonError("Rehearsal choreography cannot be changed.");
    }
    const recordGroup = record.groupId ?? null;
    const placementGroup = placement.groupId ?? null;
    if (recordGroup !== placementGroup) {
      return jsonError("Rehearsal group cannot be changed.");
    }

    const location = await resolveLocationFromParsed({ locationId: placement.locationId });
    if ("error" in location) {
      return jsonError(location.error);
    }
    resolvedLocations.push(location);
  }

  const updatedIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const [index, placement] of parsed.data.placements.entries()) {
      const location = resolvedLocations[index]!;
      await tx.event.update({
        where: { id: placement.eventId },
        data: {
          startsAt: new Date(placement.startsAt),
          endsAt: new Date(placement.endsAt),
          locationId: location.locationId,
          location: location.location,
        },
      });
      ids.push(placement.eventId);
    }
    return ids;
  });

  await Promise.all(updatedIds.map((id) => syncGoogleEventBestEffort(id)));

  return Response.json({ updated: updatedIds.length });
}
