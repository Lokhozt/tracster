"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import type { UserRole } from "@/generated/prisma/client";
import { type AdminUser } from "@/lib/users";

export function EditUserForm({ user }: { user: AdminUser }) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || null,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("userUpdateError"));
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">{t("firstName")}</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">{t("lastName")}</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+33 6 12 34 56 78"
        />
      </div>
      <div>
        <Label htmlFor="dateOfBirth">{t("dateOfBirth")}</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}

export function UserRoleForm({
  user,
  actorRole,
}: {
  user: AdminUser;
  actorRole: UserRole;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"USER" | "ADMIN">(
    user.role === "OWNER" ? "USER" : user.role,
  );

  if (user.role === "OWNER") {
    return (
      <p className="text-sm text-stone-600">
        {t("ownerRoleHelp")}
      </p>
    );
  }

  const canEditRole = actorRole === "OWNER" || actorRole === "ADMIN";

  if (!canEditRole) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/users/${user.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("roleUpdateError"));
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="role">{t("role")}</Label>
        <Select
          id="role"
          value={role}
          onChange={(event) => setRole(event.target.value as "USER" | "ADMIN")}
        >
          <option value="USER">{t("roleUSER")}</option>
          <option value="ADMIN">{t("roleADMIN")}</option>
        </Select>
        {actorRole === "ADMIN" && (
          <p className="mt-1 text-xs text-stone-500">
            {t("adminRoleHelp")}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || role === user.role}>
        {loading ? t("updating") : t("updateRole")}
      </Button>
    </form>
  );
}

export function TransferOwnershipForm({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const candidates = users.filter((user) => user.id !== currentUserId);
  const [userId, setUserId] = useState(candidates[0]?.id ?? "");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) {
      return;
    }

    if (
      !confirm(
        t("transferConfirm"),
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/users/transfer-ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("ownershipTransferError"));
      return;
    }

    router.push("/settings");
    router.refresh();
  }

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-stone-600">
        {t("addUserBeforeTransfer")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="newOwner">{t("newOwner")}</Label>
        <Select
          id="newOwner"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        >
          {candidates.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email})
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || !userId} variant="secondary">
        {loading ? t("transferring") : t("transferOwnership")}
      </Button>
    </form>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const t = useTranslations("Components");
  const styles =
    role === "OWNER"
      ? "bg-amber-100 text-amber-900"
      : role === "ADMIN"
        ? "bg-blue-100 text-blue-900"
        : "bg-stone-100 text-stone-700";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {t(`role${role}`)}
    </span>
  );
}

export function CreateUserForm({ actorRole }: { actorRole: UserRole }) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        password,
        role,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("userCreateError"));
      return;
    }

    router.push(`/users/${data.user.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">{t("firstName")}</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            autoComplete="given-name"
          />
        </div>
        <div>
          <Label htmlFor="lastName">{t("lastName")}</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
            autoComplete="family-name"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="tel"
        />
      </div>
      <div>
        <Label htmlFor="dateOfBirth">{t("dateOfBirth")}</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div>
        <Label htmlFor="role">{t("role")}</Label>
        <Select
          id="role"
          value={role}
          onChange={(event) => setRole(event.target.value as "USER" | "ADMIN")}
        >
          <option value="USER">{t("roleUSER")}</option>
          <option value="ADMIN">{t("roleADMIN")}</option>
        </Select>
        {actorRole === "ADMIN" && (
          <p className="mt-1 text-xs text-stone-500">
            {t("adminCreateHelp")}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t("creating") : t("createUser")}
      </Button>
    </form>
  );
}
