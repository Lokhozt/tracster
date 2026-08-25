"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AuthNav({ stacked = false }: { stacked?: boolean }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex gap-2 text-sm", stacked ? "flex-col" : "flex-wrap")}>
      <Link
        href="/login"
        aria-current={pathname === "/login" ? "page" : undefined}
        className={cn(
          "inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 font-medium transition",
          stacked && "w-full justify-center",
          pathname === "/login"
            ? "bg-stone-900 text-white"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
        )}
      >
        Sign in
      </Link>
      <Link
        href="/register"
        aria-current={pathname === "/register" ? "page" : undefined}
        className={cn(
          "inline-flex min-h-11 items-center rounded-lg px-4 py-1.5 font-medium transition",
          stacked && "w-full justify-center",
          pathname === "/register"
            ? "bg-stone-900 text-white"
            : "bg-stone-900 text-white hover:bg-stone-700",
        )}
      >
        Register
      </Link>
    </div>
  );
}
