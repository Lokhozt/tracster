"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { getServerTranslator, translateMessageWith } from "@/i18n/server";

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState | null,
  formData: FormData,
): Promise<LoginState | null> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const t = await getServerTranslator();
    return {
      error: translateMessageWith(
        t,
        parsed.error.issues[0]?.message ?? "Invalid input.",
      ),
    };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const t = await getServerTranslator();
    return { error: t("messages.Invalid email or password.") };
  }

  await createSession(user.id);
  redirect("/");
}
