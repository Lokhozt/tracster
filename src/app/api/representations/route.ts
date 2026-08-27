import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, unauthorized } from "@/lib/api";
import { representationSchema } from "@/lib/validations";
import { resolveLocationFromParsed } from "@/lib/locations";
import { getUserRepresentations } from "@/lib/representations";
import { getEventTypeByKind } from "@/lib/event-types";
import { canCreateEvent } from "@/lib/site-settings";
import { forbidden } from "@/lib/api";
import { canCreateEventOfType } from "@/lib/events";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const representations = await getUserRepresentations(user.id);

  return Response.json({ representations });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = representationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const eventType = await getEventTypeByKind("REPRESENTATION");
  if (!eventType) {
    return jsonError("Representation event type is not configured.");
  }

  const canCreateGeneric = await canCreateEvent(user.id);
  if (
    !(await canCreateEventOfType({
      userId: user.id,
      kind: "REPRESENTATION",
      choreographyIds: parsed.data.choreographyIds,
      canCreateGeneric,
    }))
  ) {
    return forbidden();
  }

  const location = await resolveLocationFromParsed(parsed.data);
  if ("error" in location) {
    return jsonError(location.error);
  }

  const representation = await prisma.event.create({
    data: {
      typeId: eventType.id,
      title: parsed.data.title ?? "",
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      locationId: location.locationId,
      location: location.location,
      notes: parsed.data.notes,
      createdById: user.id,
      choreographies: parsed.data.choreographyIds?.length
        ? {
            create: parsed.data.choreographyIds.map((choreographyId) => ({
              choreographyId,
            })),
          }
        : undefined,
    },
    include: {
      choreographies: {
        where: { choreography: { archivedAt: null } },
        include: { choreography: { select: { id: true, title: true } } },
      },
    },
  });

  return Response.json({ representation, event: representation }, { status: 201 });
}
