import type { EventKind } from "@/lib/event-type-helpers";
import { eventCardClassName } from "@/lib/event-category-filter";
import { cn } from "@/lib/utils";

/**
 * Event row: neutral surface with the type as a coloured left edge. It repeats `Card`'s shape instead of wrapping it
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
        "rounded-lg border p-3 transition-shadow sm:p-4",
        eventCardClassName(kind),
        className,
      )}
      {...props}
    />
  );
}
