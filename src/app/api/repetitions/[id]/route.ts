import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { repetitionSchema } from "@/lib/validations";
import { basicUserSelect } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

async function getRepetition(id: string) {
  return prisma.repetitionEvent.findUnique({
    where: { id },
    select: { id: true, choreographyId: true },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  const repetition = await prisma.repetitionEvent.findUnique({
    where: { id },
    include: {
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

  if (!repetition) {
    return notFound("Repetition");
  }

  if (!(await canViewChoreography(repetition.choreographyId, user.id))) {
    return forbidden();
  }

  return Response.json({ repetition });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const repetition = await getRepetition(id);

  if (!repetition) {
    return notFound("Repetition");
  }

  if (!(await canEditChoreography(repetition.choreographyId, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = repetitionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const updated = await prisma.repetitionEvent.update({
    where: { id },
    data: {
      title: parsed.data.title,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      location: parsed.data.location,
      notes: parsed.data.notes,
    },
  });

  return Response.json({ repetition: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const repetition = await getRepetition(id);

  if (!repetition) {
    return notFound("Repetition");
  }

  if (!(await canEditChoreography(repetition.choreographyId, user.id))) {
    return forbidden();
  }

  await prisma.repetitionEvent.delete({ where: { id } });

  return Response.json({ ok: true });
}
