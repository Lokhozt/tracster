import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { resetPasswordSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!record || record.expiresAt <= new Date()) {
    return jsonError("This password reset link is invalid or has expired.", 400);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id: record.id, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) {
        throw new Error("INVALID_RESET");
      }

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await tx.session.deleteMany({ where: { userId: record.userId } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_RESET") {
      return jsonError("This password reset link is invalid or has expired.", 400);
    }
    throw error;
  }

  return Response.json({ ok: true });
}
