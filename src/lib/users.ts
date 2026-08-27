import type { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type UserNameFields = {
  firstName: string;
  lastName: string;
};

export function formatUserName(user: UserNameFields): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function isBirthdayOnDate(dateOfBirth: Date, date: Date): boolean {
  return (
    dateOfBirth.getUTCMonth() === date.getMonth() &&
    dateOfBirth.getUTCDate() === date.getDate()
  );
}

export function formatBirthdayGreeting(users: UserNameFields[]): string | null {
  if (users.length === 0) {
    return null;
  }

  return `Today, happy birthday to ${users.map(formatUserName).join(", ")}`;
}

export async function getUsersWithBirthdayToday(now = new Date()) {
  const users = await prisma.user.findMany({
    where: { dateOfBirth: { not: null } },
    select: { firstName: true, lastName: true, dateOfBirth: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return users.filter(
    (user): user is typeof user & { dateOfBirth: Date } =>
      user.dateOfBirth !== null && isBirthdayOnDate(user.dateOfBirth, now),
  );
}

export const basicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

export const adminUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  dateOfBirth: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type BasicUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  name: string;
};

export type AdminUser = BasicUser & {
  phone: string | null;
  dateOfBirth: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export function serializeBasicUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}): BasicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    name: formatUserName(user),
  };
}

export function serializeAdminUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: Date | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}): AdminUser {
  return {
    ...serializeBasicUser(user),
    phone: user.phone,
    dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const roleLabels: Record<UserRole, string> = {
  USER: "User",
  ADMIN: "Admin",
  OWNER: "Owner",
};
