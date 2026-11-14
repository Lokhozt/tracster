"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { FormSheet } from "@/components/Sheet";

/** What a create route renders: its title and its form (as a page or in a sheet). */
export type CreateRouteContent = { title: string; form: React.ReactNode };

/**
 * A create route (`/…/new`) opened from inside the app: its form in a `FormSheet` over the page
 * you were on (intercepted route in the `@modal` slot). Closing goes back, so the URL and the
 * phone's back button stay in step. A reload or a shared link shows the full page instead.
 */
export function RouteSheet({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const closing = useRef(false);

  return (
    <FormSheet
      open
      title={title}
      onClose={() => {
        if (closing.current) {
          return;
        }
        closing.current = true;
        router.back();
      }}
    >
      {children}
    </FormSheet>
  );
}
