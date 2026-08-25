import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, unauthorized } from "@/lib/api";
import { representationSchema } from "@/lib/validations";
import { getUserRepresentations } from "@/lib/representations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const representations = await getUserRepresentations(user.id);

  return Response.json({ representations });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = representationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const representation = await prisma.representation.create({
    data: {
      title: parsed.data.title,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      location: parsed.data.location,
      notes: parsed.data.notes,
      createdById: user.id,
      choreographies: parsed.data.choreographyIds?.length
        ? {
            create: parsed.data.choreographyIds.map((choreographyId) => ({
              choreographyId,
            })),
          }
        : undefined,
    },
    include: {
      choreographies: {
        include: { choreography: { select: { id: true, title: true } } },
      },
    },
  });

  return Response.json({ representation }, { status: 201 });
}
