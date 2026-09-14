import type { EventKind } from "@/lib/event-type-helpers";
import { eventCardClassName } from "@/lib/event-category-filter";
import { cn } from "@/lib/utils";

/**
 * Card surface tinted by event type. It repeats `Card`'s shape instead of wrapping it
 * because `cn` only concatenates, so `Card`'s own `bg-white` would win on CSS order.
 */
export function EventCard({
  kind,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { kind: EventKind | null }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm transition sm:p-5",
        eventCardClassName(kind),
        className,
      )}
      {...props}
    />
  );
}
