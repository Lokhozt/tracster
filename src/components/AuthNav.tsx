"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AuthNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 text-sm">
      <Link
        href="/login"
        aria-current={pathname === "/login" ? "page" : undefined}
        className={cn(
          "rounded-lg px-3 py-1.5 font-medium transition",
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
          "rounded-lg px-4 py-1.5 font-medium transition",
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
