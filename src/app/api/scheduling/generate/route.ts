import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import { buildSchedulingProblem, generateScheduleCandidates } from "@/lib/scheduling";
import { schedulingRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isAdmin(user.id))) {
    return forbidden();
  }

  const body = await request.json();
  const parsed = schedulingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const problem = await buildSchedulingProblem({
    ...parsed.data,
    items: parsed.data.items.map((item) => ({
      ...item,
      groupId: item.groupId ?? null,
    })),
  });

  if ("error" in problem) {
    return jsonError(problem.error);
  }

  const candidates = generateScheduleCandidates(problem);
  if (candidates.length === 0) {
    return jsonError(
      "No complete schedule could be generated. Add location time, shorten durations, or reduce the number of rehearsals.",
    );
  }

  return Response.json({ candidates });
}
