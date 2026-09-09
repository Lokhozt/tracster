import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetSecret() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function passwordResetUrl(origin: string, token: string) {
  return new URL(`/reset-password/${token}`, origin).toString();
}

export async function findActivePasswordReset(userId: string) {
  return prisma.passwordResetToken.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
    select: { id: true, expiresAt: true },
  });
}
