import { cloneElement, isValidElement } from "react";
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

/**
 * Shared look of text inputs, selects and text areas (width and height are set per control:
 * `cn` does not resolve conflicting classes).
 */
export const FIELD_CONTROL_CLASS =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 shadow-xs outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:ring-3 focus:ring-stone-900/15 disabled:bg-stone-100 disabled:text-stone-500 sm:text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-800";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(FIELD_CONTROL_CLASS, "min-h-11 w-full", className)}
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
      className={cn(FIELD_CONTROL_CLASS, "w-full", className)}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-stone-800", className)} {...props} />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      // Width stays with the caller (selects are also used inline in toolbars).
      className={cn(FIELD_CONTROL_CLASS, "min-h-11", className)}
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

/** A choice between a few options, as joined buttons (e.g. "Créer" / "Lier"). */
export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  /** Accessible name of the group. */
  label: string;
  value: Value;
  options: { value: Value; label: React.ReactNode }[];
  onChange: (value: Value) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex rounded-xl bg-stone-100 p-1", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition",
              selected ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A form option as a row: label (and hint) on the left, a switch on the right. */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    // A <label>: tapping the text toggles the switch as well.
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-stone-200 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-stone-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-stone-500">{hint}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </label>
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
      // In a FormSheet, the form's last FormActions sticks to the bottom (see FormSheet).
      data-form-actions=""
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A form field: label, control, then an optional hint and error. Pass the control's id as
 * `htmlFor`.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  /** Shown after the label, e.g. "(optional)". */
  optional?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const hintId = htmlFor && hint ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  // The control (single element child) gets the hint/error as its description.
  const control =
    describedBy && isValidElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>(children)
      ? cloneElement(children, {
          "aria-describedby": describedBy,
          ...(error ? { "aria-invalid": true } : {}),
        })
      : children;
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-stone-500">{optional}</span>}
      </Label>
      {control}
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** A group of related fields in a form, under a small heading (e.g. "Quand", "Où"). */
export function FormSection({
  title,
  description,
  className,
  children,
}: {
  /** Null for no heading (a group of one field reads better under its own label). */
  title: React.ReactNode | null;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {title && (
        <div>
          <h3 className="text-base font-semibold text-stone-900">{title}</h3>
          {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Error message of a whole form, shown just above its buttons. */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) {
    return null;
  }
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
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
