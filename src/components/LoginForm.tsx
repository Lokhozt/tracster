"use client";

import { useTranslations } from "next-intl";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/app/login/actions";
import { Button, Input, Label } from "@/components/ui";

type LoginFormProps = {
  defaultEmail?: string;
};

export function LoginForm({ defaultEmail }: LoginFormProps) {
  const t = useTranslations("Components");
  const [state, formAction, pending] = useActionState<LoginState | null, FormData>(
    login,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={defaultEmail}
        />
      </div>
      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("signingIn") : t("signIn")}
      </Button>
      <p className="text-center text-sm text-stone-600">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-stone-900">
          {t("register")}
        </Link>
      </p>
    </form>
  );
}
