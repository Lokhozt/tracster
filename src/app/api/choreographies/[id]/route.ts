import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import {
  deleteChoreography,
  getActiveChoreographyForAdmin,
  getUpcomingChoreographyImpact,
  serializeUpcomingImpact,
} from "@/lib/choreographies";
import {
  formatChoreographyLifecycleWarning,
  hasUpcomingImpact,
} from "@/lib/choreography-lifecycle";
import { canEditChoreography, canViewChoreography } from "@/lib/permissions";
import { isAdmin } from "@/lib/roles";
import { basicUserSelect } from "@/lib/users";
import { choreographyLifecycleSchema, choreographySchema } from "@/lib/validations";
import { syncChoreographyRehearsals } from "@/lib/google-calendar";
import { getServerLocale, getServerTranslator } from "@/i18n/server";
import { ChoreographyResourceCleanupError } from "@/lib/choreography-resources";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canViewChoreography(id, user.id))) {
    return forbidden();
  }

  const choreography = await prisma.choreography.findUnique({
    where: { id },
    include: {
      createdBy: { select: basicUserSelect },
      choreographers: {
        include: { user: { select: basicUserSelect } },
      },
      members: {
        include: { user: { select: basicUserSelect } },
      },
      rehearsals: {
        orderBy: { startsAt: "asc" },
        include: {
          availabilities: {
            include: { user: { select: basicUserSelect } },
          },
        },
      },
      eventLinks: {
        include: {
          event: true,
        },
      },
    },
  });

  if (!choreography) {
    return notFound("Choreography");
  }

  return Response.json({ choreography });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!(await canEditChoreography(id, user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = choreographySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const choreography = await prisma.choreography.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      allowParticipantJoin: parsed.data.allowParticipantJoin ?? false,
      allowJoinRequests: parsed.data.allowJoinRequests ?? false,
      hideFromNonParticipants: parsed.data.hideFromNonParticipants ?? true,
    },
    include: {
      createdBy: { select: basicUserSelect },
    },
  });
  await syncChoreographyRehearsals(id);

  return Response.json({ choreography });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isAdmin(user.id))) {
    return forbidden();
  }

  const { id } = await context.params;
  const choreography = await getActiveChoreographyForAdmin(id);
  if (!choreography) {
    return notFound("Choreography");
  }

  let confirmUpcoming = false;
  try {
    const body = await request.json();
    const parsed = choreographyLifecycleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }
    confirmUpcoming = parsed.data.confirmUpcoming === true;
  } catch {
    confirmUpcoming = false;
  }

  const impact = await getUpcomingChoreographyImpact(id);
  if (hasUpcomingImpact(impact) && !confirmUpcoming) {
    const [t, locale] = await Promise.all([
      getServerTranslator(user.displayLanguage),
      getServerLocale(user.displayLanguage),
    ]);
    return NextResponse.json(
      {
        error: formatChoreographyLifecycleWarning({
          action: "delete",
          title: choreography.title,
          impact,
          t,
          locale,
        }),
        requiresConfirmation: true,
        upcoming: serializeUpcomingImpact(impact),
      },
      { status: 409 },
    );
  }

  try {
    await deleteChoreography(id);
  } catch (error) {
    if (error instanceof ChoreographyResourceCleanupError) {
      return jsonError(error.message, 503);
    }
    throw error;
  }
  return Response.json({ ok: true });
}
