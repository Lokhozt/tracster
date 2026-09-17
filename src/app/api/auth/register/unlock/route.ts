import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api";
import { isRegistrationPasswordRequired, registrationPasswordMatches } from "@/lib/registering-password";
import { z } from "zod";

const unlockSchema = z.object({
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  if (!isRegistrationPasswordRequired()) {
    return Response.json({ ok: true });
  }

  const body = await request.json();
  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  if (!registrationPasswordMatches(parsed.data.password)) {
    return jsonError("Incorrect registration password.", 403);
  }

  return Response.json({ ok: true });
}
