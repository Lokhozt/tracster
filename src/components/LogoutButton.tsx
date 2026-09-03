"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations("Navigation");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" onClick={handleLogout}>
      {t("signOut")}
    </Button>
  );
}
