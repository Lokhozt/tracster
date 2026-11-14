import { cn } from "@/lib/utils";

/**
 * Small stroke icons shared by the app (one family: 24 grid, 2px stroke, round caps), instead
 * of text characters (← → ›) or emoji, so they align and scale with the rest of the UI.
 */
function Icon({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4 shrink-0", className)}
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

export function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

/** "Opens something": end of a tappable row or card title. */
export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <Icon className={cn("text-stone-400", className)}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  );
}
