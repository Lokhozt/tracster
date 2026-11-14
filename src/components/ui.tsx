import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variant === "primary" && "bg-stone-900 text-white hover:bg-stone-700",
        variant === "secondary" &&
          "border border-stone-300 bg-white text-stone-900 hover:bg-stone-100",
        variant === "ghost" && "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-stone-400 focus:ring-2 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

/** Search field with a magnifier icon inside it. */
export function SearchInput({
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <Input type="search" autoComplete="off" className={cn("pl-9", className)} {...props} />
    </div>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-stone-400 focus:ring-2 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1 block text-sm font-medium text-stone-700", className)} {...props} />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-stone-400 focus:ring-2 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

/** On/off switch (role="switch"): for settings that apply immediately. */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name (the visible label usually sits next to the switch). */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50",
        checked ? "bg-emerald-600" : "bg-stone-300",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

/**
 * Buttons at the end of a form. Write them in reading order, secondary first (e.g. Annuler),
 * primary last. Phones: full width, stacked, primary on top (easy to reach with a thumb).
 * From `sm`: right-aligned on one row, the secondary to the left of the primary.
 */
export function FormActions({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5", className)}
      {...props}
    />
  );
}
