"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RoleBadge } from "@/components/UserForms";
import { Card, Input, Label, Select } from "@/components/ui";
import type { UserRole } from "@/generated/prisma/client";
import { roleLabels, type AdminUser } from "@/lib/users";
import { formatDateTime } from "@/lib/datetime";

function formatDateOfBirth(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function matchesSearch(user: AdminUser, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    user.name,
    user.firstName,
    user.lastName,
    user.email,
    user.phone ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return normalized.split(/\s+/).every((term) => haystack.includes(term));
}

export function UsersList({ users }: { users: AdminUser[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) {
        return false;
      }
      return matchesSearch(user, search);
    });
  }, [users, search, roleFilter]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div>
            <Label htmlFor="user-search">Search</Label>
            <Input
              id="user-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, or phone…"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="user-role-filter">Role</Label>
            <Select
              id="user-role-filter"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as UserRole | "ALL")
              }
              className="w-full"
            >
              <option value="ALL">All roles</option>
              <option value="USER">{roleLabels.USER}</option>
              <option value="ADMIN">{roleLabels.ADMIN}</option>
              <option value="OWNER">{roleLabels.OWNER}</option>
            </Select>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-500">
          {filteredUsers.length} of {users.length} users
        </p>
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <p className="text-stone-600">No users match your search.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((entry) => (
            <Link key={entry.id} href={`/users/${entry.id}`}>
              <Card className="transition hover:border-stone-400">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{entry.name}</h2>
                      <RoleBadge role={entry.role} />
                    </div>
                    <p className="mt-1 text-sm text-stone-600">{entry.email}</p>
                    {entry.phone && (
                      <p className="mt-1 text-sm text-stone-500">{entry.phone}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-stone-500">
                    <p>Born {formatDateOfBirth(entry.dateOfBirth)}</p>
                    <p className="mt-1">Updated {formatDateTime(new Date(entry.updatedAt))}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
