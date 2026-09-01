import { cn } from "@/lib/utils";

export function ParticipatingCheck({
  className,
  label = "You are participating",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center text-green-600", className)}
      title={label}
      aria-label={label}
      role="img"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}
