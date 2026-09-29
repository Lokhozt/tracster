import { getCurrentUser } from "@/lib/auth";
import { forbidden, notFound, unauthorized } from "@/lib/api";
import { canViewEvent } from "@/lib/events";
import { syncRehearsalAvailabilityFromUnavailability } from "@/lib/rehearsal-availability";
import { isAtLeastManager } from "@/lib/roles";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!isAtLeastManager(user.role)) {
    return forbidden();
  }

  const { id } = await context.params;
  if (!(await canViewEvent(id, user.id))) {
    return notFound("Rehearsal");
  }

  const result = await syncRehearsalAvailabilityFromUnavailability(id);
  if (!result) {
    return notFound("Rehearsal");
  }

  return Response.json(result);
}
