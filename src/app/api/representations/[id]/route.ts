import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { representationSchema } from "@/lib/validations";
import { resolveLocationFromParsed } from "@/lib/locations";
import { assertRepresentationEvent } from "@/lib/representations";
import { canEditEvent, canViewEvent } from "@/lib/events";
import { syncGoogleEventBestEffort } from "@/lib/google-calendar";

type RouteContext = { params: Promise<{ id: string }> };

async function getRepresentation(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      type: { select: { kind: true } },
      choreographies: {
        where: { choreography: { archivedAt: null } },
        include: { choreography: { select: { id: true, title: true } } },
      },
    },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canViewEvent(id, user.id))) {
    return forbidden();
  }

  const representation = await getRepresentation(id);
  if (!representation || representation.type.kind !== "REPRESENTATION") {
    return notFound("Representation");
  }

  return Response.json({ representation });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  if (!(await assertRepresentationEvent(id))) {
    return notFound("Representation");
  }

  const body = await request.json();
  const parsed = representationSchema.safeParse(body);
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
    include: {
      choreographies: {
        where: { choreography: { archivedAt: null } },
        include: { choreography: { select: { id: true, title: true } } },
      },
    },
  });
  await syncGoogleEventBestEffort(id);

  return Response.json({ representation: updated, event: updated });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditEvent(id, user.id))) {
    return forbidden();
  }

  if (!(await assertRepresentationEvent(id))) {
    return notFound("Representation");
  }

  await prisma.event.delete({ where: { id } });
  await syncGoogleEventBestEffort(id);

  return Response.json({ ok: true });
}
