import { prisma } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/client";

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role ?? null;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "ADMIN" || role === "OWNER";
}

export async function isOwner(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "OWNER";
}

export async function canManageUsers(userId: string): Promise<boolean> {
  return isAdmin(userId);
}

export async function canManageSettings(userId: string): Promise<boolean> {
  return isAdmin(userId);
}

export async function hasGlobalAccess(userId: string): Promise<boolean> {
  return isAdmin(userId);
}

export function canAssignRole(
  actorRole: UserRole,
  targetRole: UserRole,
  newRole: UserRole,
): boolean {
  if (newRole === "OWNER") {
    return false;
  }

  if (actorRole === "OWNER") {
    return targetRole !== "OWNER";
  }

  if (actorRole === "ADMIN") {
    if (targetRole === "OWNER") {
      return false;
    }
    return newRole === "USER" || newRole === "ADMIN";
  }

  return false;
}

export function canCreateUserWithRole(actorRole: UserRole, role: UserRole): boolean {
  return canAssignRole(actorRole, "USER", role);
}

export async function canEditUserProfile(
  actorId: string,
  _targetId: string,
): Promise<boolean> {
  return canManageUsers(actorId);
}

export async function canChangeUserRole(
  actorId: string,
  targetId: string,
  newRole: UserRole,
): Promise<boolean> {
  if (actorId === targetId) {
    return false;
  }

  const [actor, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { role: true } }),
  ]);

  if (!actor || !target) {
    return false;
  }

  if (target.role === "OWNER") {
    return false;
  }

  return canAssignRole(actor.role, target.role, newRole);
}
