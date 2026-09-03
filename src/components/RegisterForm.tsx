"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, Label } from "@/components/ui";

export function RegisterForm() {
  const t = useTranslations("Components");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        phone: formData.get("phone") || undefined,
        dateOfBirth: formData.get("dateOfBirth") || undefined,
        password: formData.get("password"),
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("registerError"));
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">{t("firstName")}</Label>
          <Input id="firstName" name="firstName" required autoComplete="given-name" />
        </div>
        <div>
          <Label htmlFor="lastName">{t("lastName")}</Label>
          <Input id="lastName" name="lastName" required autoComplete="family-name" />
        </div>
      </div>
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div>
        <Label htmlFor="dateOfBirth">{t("dateOfBirth")}</Label>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" />
      </div>
      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t("creatingAccount") : t("createAccount")}
      </Button>
      <p className="text-center text-sm text-stone-600">
        {t("alreadyAccount")}{" "}
        <Link href="/login" className="font-medium text-stone-900">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
