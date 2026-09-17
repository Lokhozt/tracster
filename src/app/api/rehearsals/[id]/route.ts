import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canEditEvent, canViewEvent } from "@/lib/events";
import { rehearsalSchema } from "@/lib/validations";
import { basicUserSelect } from "@/lib/users";
import { resolveLocationFromParsed } from "@/lib/locations";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";
import {
  deleteEventsAndSync,
  loadSeriesOrigin,
  loadUpcomingSeriesTargets,
  shiftedOccurrence,
} from "@/lib/event-series";

type RouteContext = { params: Promise<{ id: string }> };

async function getRehearsal(id: string) {
  return prisma.event.findUnique({
    where: { id },
    select: { id: true, choreographyId: true, type: { select: { kind: true } } },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  const rehearsal = await prisma.event.findUnique({
    where: { id },
    include: {
      type: { select: { kind: true } },
      choreography: {
        include: {
          members: {
            include: { user: { select: basicUserSelect } },
          },
        },
      },
      availabilities: {
        include: { user: { select: basicUserSelect } },
      },
    },
  });

  if (!rehearsal || rehearsal.type.kind !== "REHEARSAL") {
    return notFound("Rehearsal");
  }

  if (!(await canViewEvent(id, user.id))) {
    return forbidden();
  }

  return Response.json({ rehearsal, event: rehearsal });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const rehearsal = await getRehearsal(id);

  if (!rehearsal || rehearsal.type.kind !== "REHEARSAL") {
    return notFound("Rehearsal");
  }

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = rehearsalSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const location = await resolveLocationFromParsed(parsed.data);
  if ("error" in location) {
    return jsonError(location.error);
  }

  const origin = await loadSeriesOrigin(id);
  if (!origin) {
    return notFound("Rehearsal");
  }

  const applyToUpcoming = Boolean(parsed.data.applyToUpcoming);
  const targets = await loadUpcomingSeriesTargets(origin, applyToUpcoming);
  for (const target of targets) {
    if (!(await canEditEvent(target.id, user.id))) {
      return forbidden();
    }
  }

  const nextStartsAt = new Date(parsed.data.startsAt);
  const nextEndsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;

  const updated = await prisma.$transaction(async (tx) => {
    let current = null;
    for (const target of targets) {
      const schedule = shiftedOccurrence(
        origin.startsAt,
        nextStartsAt,
        nextEndsAt,
        target.startsAt,
      );
      const event = await tx.event.update({
        where: { id: target.id },
        data: {
          title: parsed.data.title ?? "",
          startsAt: schedule.startsAt,
          endsAt: schedule.endsAt,
          locationId: location.locationId,
          location: location.location,
          notes: parsed.data.notes,
        },
      });
      if (event.id === id) {
        current = event;
      }
    }
    return current;
  });

  if (!updated) {
    return notFound("Rehearsal");
  }

  await Promise.all(targets.map((target) => syncGoogleEventBestEffort(target.id)));

  return Response.json({ rehearsal: updated, event: updated });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const rehearsal = await getRehearsal(id);

  if (!rehearsal || rehearsal.type.kind !== "REHEARSAL") {
    return notFound("Rehearsal");
  }

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  const origin = await loadSeriesOrigin(id);
  if (!origin) {
    return notFound("Rehearsal");
  }

  const applyToUpcoming = request.nextUrl.searchParams.get("upcoming") === "1";
  const targets = await loadUpcomingSeriesTargets(origin, applyToUpcoming);
  for (const target of targets) {
    if (!(await canEditEvent(target.id, user.id))) {
      return forbidden();
    }
  }

  await deleteEventsAndSync(
    targets.map((target) => target.id),
    origin.seriesId,
  );

  return Response.json({ ok: true });
}
