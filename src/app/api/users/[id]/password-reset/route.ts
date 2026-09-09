import { NextRequest } from "next/server";
import { forbidden, jsonError, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createPasswordResetSecret,
  findActivePasswordReset,
  passwordResetUrl,
} from "@/lib/password-reset";
import { canManageUsers } from "@/lib/roles";
import { passwordResetLinkSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

async function getManageableUser(actorId: string, id: string) {
  if (!(await canManageUsers(actorId))) {
    return { error: await forbidden() };
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) {
    return { error: await notFound("User") };
  }

  return { target };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const result = await getManageableUser(user.id, id);
  if ("error" in result) {
    return result.error;
  }

  const active = await findActivePasswordReset(id);
  return Response.json({
    expiresAt: active?.expiresAt.toISOString() ?? null,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const result = await getManageableUser(user.id, id);
  if ("error" in result) {
    return result.error;
  }

  const body = await request.json().catch(() => ({}));
  const parsed = passwordResetLinkSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { token, tokenHash } = createPasswordResetSecret();
  const expiresAt = new Date(Date.now() + parsed.data.hours * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
    prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: id,
        createdById: user.id,
        expiresAt,
      },
    }),
  ]);

  return Response.json(
    {
      url: passwordResetUrl(request.nextUrl.origin, token),
      expiresAt: expiresAt.toISOString(),
    },
    { status: 201 },
  );
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const result = await getManageableUser(user.id, id);
  if ("error" in result) {
    return result.error;
  }

  await prisma.passwordResetToken.deleteMany({ where: { userId: id } });
  return Response.json({ ok: true });
}
