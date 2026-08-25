import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, unauthorized } from "@/lib/api";
import { eventSchema } from "@/lib/validations";
import { getUserEvents } from "@/lib/events";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const events = await getUserEvents(user.id);

  return Response.json({ events });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const event = await prisma.event.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      location: parsed.data.location,
      createdById: user.id,
      participants: parsed.data.participantIds?.length
        ? {
            create: parsed.data.participantIds.map((userId) => ({ userId })),
          }
        : undefined,
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  return Response.json({ event }, { status: 201 });
}
