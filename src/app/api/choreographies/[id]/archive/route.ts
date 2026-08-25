import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, forbidden, notFound, unauthorized } from "@/lib/api";
import {
  archiveChoreography,
  getActiveChoreographyForAdmin,
  getUpcomingChoreographyImpact,
  serializeUpcomingImpact,
} from "@/lib/choreographies";
import {
  formatChoreographyLifecycleWarning,
  hasUpcomingImpact,
} from "@/lib/choreography-lifecycle";
import { isAdmin } from "@/lib/roles";
import { choreographyLifecycleSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
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

  const body = await request.json().catch(() => ({}));
  const parsed = choreographyLifecycleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const impact = await getUpcomingChoreographyImpact(id);
  if (hasUpcomingImpact(impact) && parsed.data.confirmUpcoming !== true) {
    return NextResponse.json(
      {
        error: formatChoreographyLifecycleWarning({
          action: "archive",
          title: choreography.title,
          impact,
        }),
        requiresConfirmation: true,
        upcoming: serializeUpcomingImpact(impact),
      },
      { status: 409 },
    );
  }

  await archiveChoreography(id);
  return Response.json({ ok: true });
}
