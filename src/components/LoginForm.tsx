"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/app/login/actions";
import { Button, Input, Label } from "@/components/ui";

type LoginFormProps = {
  defaultEmail?: string;
};

export function LoginForm({ defaultEmail }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState | null, FormData>(
    login,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
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
        <Label htmlFor="password">Password</Label>
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
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-sm text-stone-600">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-stone-900">
          Register
        </Link>
      </p>
    </form>
  );
}
