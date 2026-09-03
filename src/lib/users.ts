import type { UserRole } from "@/generated/prisma/client";

type MessageTranslator = (key: string, values?: Record<string, string | number>) => string;

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

export function formatBirthdayGreeting(
  users: UserNameFields[],
  t?: MessageTranslator,
): string | null {
  if (users.length === 0) {
    return null;
  }

  const names = users.map(formatUserName).join(", ");
  return t ? t("birthdayGreeting", { names }) : `Today, happy birthday to ${names}`;
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

export function getRoleLabels(t: MessageTranslator): Record<UserRole, string> {
  return {
    USER: t("roles.USER"),
    ADMIN: t("roles.ADMIN"),
    OWNER: t("roles.OWNER"),
  };
}
