import { NextRequest } from "next/server";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { loadPlanningRehearsalPlacements } from "@/lib/scheduling/planning-load";
import { schedulingPlanningPeriodSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  if (!(await isAdmin(user.id))) {
    return forbidden();
  }

  const parsed = schedulingPlanningPeriodSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await loadPlanningRehearsalPlacements(
    parsed.data.startDate,
    parsed.data.endDate,
  );
  if ("error" in result) {
    return jsonError(result.error);
  }

  return Response.json(result);
}
