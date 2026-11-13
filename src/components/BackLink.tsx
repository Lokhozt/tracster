"use client";

import Link from "next/link";
import { previousAppPath, useAppNavigation } from "@/lib/app-navigation";

/**
 * "← Back" link: returns to the previous app page when there is one (like the phone's back
 * button), otherwise opens `href` (e.g. when the page was opened from a shared link).
 */
export function BackLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const navigation = useAppNavigation();

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (previousAppPath()) {
          event.preventDefault();
          navigation.back(href);
        }
      }}
    >
      {children}
    </Link>
  );
}
