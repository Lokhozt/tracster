import { cn } from "@/lib/utils";

export function ChoreographerBadge({
  className,
  label = "You are a choreographer",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center leading-none", className)}
      title={label}
      aria-label={label}
      role="img"
    >
      👑
    </span>
  );
}
