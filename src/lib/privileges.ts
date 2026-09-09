import type { UserRole } from "@/generated/prisma/client";

export function canHoldAdminPrivileges(role: UserRole): boolean {
  return role === "ADMIN" || role === "OWNER";
}

export function hasAdminPrivileges(user: {
  role: UserRole;
  adminPrivilegesEnabled: boolean;
}): boolean {
  return canHoldAdminPrivileges(user.role) && user.adminPrivilegesEnabled;
}
