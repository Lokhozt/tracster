import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canEditEvent, canViewEvent } from "@/lib/events";
import { rehearsalSchema } from "@/lib/validations";
import { basicUserSelect } from "@/lib/users";
import { resolveLocationFromParsed } from "@/lib/locations";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";

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

  const updated = await prisma.event.update({
    where: { id },
    data: {
      title: parsed.data.title ?? "",
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      locationId: location.locationId,
      location: location.location,
      notes: parsed.data.notes,
    },
  });
  await syncGoogleEventBestEffort(id);

  return Response.json({ rehearsal: updated, event: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
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

  await prisma.event.delete({ where: { id } });
  await syncGoogleEventBestEffort(id);

  return Response.json({ ok: true });
}
