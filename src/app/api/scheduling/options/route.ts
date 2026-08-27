import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden } from "@/lib/api";
import { visibleChoreographyWhere } from "@/lib/choreographies";
import { isAdmin } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isAdmin(user.id))) {
    return forbidden();
  }

  const [choreographies, locations] = await Promise.all([
    prisma.choreography.findMany({
      where: visibleChoreographyWhere,
      select: {
        id: true,
        title: true,
        groups: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { title: "asc" },
    }),
    prisma.location.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return Response.json({
    choreographies,
    locations,
  });
}
