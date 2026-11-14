"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function useLogout(): () => Promise<void> {
  const router = useRouter();

  return async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
}

export function LogoutButton() {
  const t = useTranslations("Navigation");
  const handleLogout = useLogout();

  return (
    <Button type="button" variant="secondary" onClick={handleLogout}>
      {t("signOut")}
    </Button>
  );
}
