import { NextRequest } from "next/server";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import { schedulingCollectionSchema } from "@/lib/validations";

const collectionSelect = {
  id: true,
  name: true,
  items: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      choreographyId: true,
      groupId: true,
      durationMinutes: true,
    },
  },
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  if (!(await isAdmin(user.id))) {
    return forbidden();
  }

  const collections = await prisma.schedulingCollection.findMany({
    orderBy: { name: "asc" },
    select: collectionSelect,
  });
  return Response.json({ collections });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }
  if (!(await isAdmin(user.id))) {
    return forbidden();
  }

  const parsed = schedulingCollectionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const choreographyIds = [...new Set(parsed.data.items.map((item) => item.choreographyId))];
  const choreographies = await prisma.choreography.findMany({
    where: { ...visibleChoreographyWhere, id: { in: choreographyIds } },
    select: { id: true, groups: { select: { id: true } } },
  });
  if (choreographies.length !== choreographyIds.length) {
    return jsonError("One of the selected choreographies was not found.");
  }

  const groupsByChoreography = new Map(
    choreographies.map((choreography) => [
      choreography.id,
      new Set(choreography.groups.map((group) => group.id)),
    ]),
  );
  for (const item of parsed.data.items) {
    if (item.groupId && !groupsByChoreography.get(item.choreographyId)?.has(item.groupId)) {
      return jsonError("Selected group does not belong to this choreography.");
    }
  }

  const existing = await prisma.schedulingCollection.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    select: { id: true },
  });
  const itemData = parsed.data.items.map((item, sortOrder) => ({
    choreographyId: item.choreographyId,
    groupId: item.groupId ?? null,
    durationMinutes: item.durationMinutes,
    sortOrder,
  }));

  const collection = existing
    ? await prisma.$transaction(async (transaction) => {
        await transaction.schedulingCollectionItem.deleteMany({
          where: { collectionId: existing.id },
        });
        return transaction.schedulingCollection.update({
          where: { id: existing.id },
          data: {
            name: parsed.data.name,
            items: { create: itemData },
          },
          select: collectionSelect,
        });
      })
    : await prisma.schedulingCollection.create({
        data: {
          name: parsed.data.name,
          items: { create: itemData },
        },
        select: collectionSelect,
      });

  return Response.json({ collection, overwritten: Boolean(existing) }, {
    status: existing ? 200 : 201,
  });
}
