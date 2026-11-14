"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyThemePreference, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Compact System / Light / Dark switch (icons), for the header and the account menu. */
export function ThemeToggle({
  initialPreference,
  className,
}: {
  initialPreference: ThemePreference;
  className?: string;
}) {
  const t = useTranslations("Components");
  const router = useRouter();
  const [preference, setPreference] = useState(initialPreference);
  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: "system", label: t("themeSystem"), icon: <SystemIcon /> },
    { value: "light", label: t("themeLight"), icon: <SunIcon /> },
    { value: "dark", label: t("themeDark"), icon: <MoonIcon /> },
  ];

  function choose(next: ThemePreference) {
    setPreference(next);
    applyThemePreference(next);
    // Re-render server metadata (status bar colour) for the new choice.
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label={t("themeTitle")}
      className={cn("inline-flex rounded-full border border-stone-300 p-0.5", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => choose(option.value)}
          aria-pressed={preference === option.value}
          aria-label={option.label}
          title={option.label}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full transition pointer-coarse:h-11 pointer-coarse:w-11",
            preference === option.value
              ? "bg-stone-900 text-white"
              : "text-stone-500 hover:bg-stone-100 hover:text-stone-900",
          )}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SystemIcon() {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </Icon>
  );
}

function SunIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </Icon>
  );
}

function MoonIcon() {
  return (
    <Icon>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </Icon>
  );
}
