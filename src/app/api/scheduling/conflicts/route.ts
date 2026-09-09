import { NextRequest } from "next/server";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { findSchedulingPlacementConflicts } from "@/lib/scheduling/conflicts";
import { schedulingConflictsSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  if (!(await isAdmin(user.id))) {
    return forbidden();
  }

  const parsed = schedulingConflictsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await findSchedulingPlacementConflicts(parsed.data.placements);
  if ("error" in result) {
    return jsonError(result.error);
  }

  return Response.json(result);
}
