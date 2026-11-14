"use client";

import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ClockDial } from "@/components/ClockDial";
import { Sheet } from "@/components/Sheet";
import { FIELD_CONTROL_CLASS } from "@/components/ui";
import type { DateTimeParts } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type Step = "date" | "hour" | "minute";

const WEEKS_SHOWN = 6;

function parseDay(date: string): Date | null {
  if (!date) {
    return null;
  }
  const parsed = parseISO(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Date and time (24 h) as one field. Tapping it opens a picker like a phone calendar app: pick
 * the day on a month grid, then the hour on a clock face, then the minutes, and it closes. "OK"
 * keeps what is picked so far; closing otherwise (outside, Escape, back) cancels.
 */
export function DateTime24Input({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  /** Kept for callers; required dates are checked by the forms themselves. */
  required?: boolean;
  value: DateTimeParts;
  onChange: (value: DateTimeParts) => void;
}) {
  const t = useTranslations("Components");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("date");
  const [draft, setDraft] = useState<DateTimeParts>(value);
  const [month, setMonth] = useState(() => startOfMonth(parseDay(value.date) ?? new Date()));

  const longDate = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const narrowWeekday = new Intl.DateTimeFormat(locale, { weekday: "narrow" });

  const valueDay = parseDay(value.date);
  const draftDay = parseDay(draft.date);

  function openAt(nextStep: Step) {
    setDraft(value);
    setMonth(startOfMonth(valueDay ?? new Date()));
    setStep(nextStep);
    setOpen(true);
  }

  function commit(next: DateTimeParts) {
    onChange(next);
    setOpen(false);
  }

  const gridStart = startOfWeek(month, { weekStartsOn: 1 });
  const days = Array.from({ length: WEEKS_SHOWN * 7 }, (_, index) => addDays(gridStart, index));

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-800">{label}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => openAt("date")}
          aria-label={t("dateInput", { label })}
          className={cn(FIELD_CONTROL_CLASS, "flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left")}
        >
          <CalendarIcon />
          <span className={cn("truncate", !valueDay && "text-stone-400")}>
            {valueDay ? longDate.format(valueDay) : t("pickerChooseDate")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => openAt("hour")}
          aria-label={t("hourInput", { label })}
          className={cn(FIELD_CONTROL_CLASS, "flex min-h-11 shrink-0 items-center gap-2 tabular-nums")}
        >
          <ClockIcon />
          {value.hour}:{value.minute}
        </button>
      </div>
      {/* Keeps the values in the form's data, like the inputs this replaced. */}
      {/* Hidden inputs are never validated by the browser: forms check required dates in JS. */}
      <input type="hidden" name={`${name}Date`} value={value.date} />
      <input type="hidden" name={`${name}Hour`} value={value.hour} />
      <input type="hidden" name={`${name}Minute`} value={value.minute} />

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        headerAction={
          <button
            type="button"
            onClick={() => commit(draft)}
            className="shrink-0 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            {t("pickerOk")}
          </button>
        }
      >
        {/* Tabs showing the current choice: the date, then the time. */}
        <div role="tablist" className="mb-4 grid grid-cols-2 border-b border-stone-200">
          <PickerTab selected={step === "date"} onClick={() => setStep("date")}>
            {draftDay ? longDate.format(draftDay) : t("pickerChooseDate")}
          </PickerTab>
          <PickerTab selected={step !== "date"} onClick={() => setStep("hour")}>
            <span className="tabular-nums">
              {draft.hour}:{draft.minute}
            </span>
          </PickerTab>
        </div>

        {step === "date" ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <MonthButton label={t("pickerPreviousMonth")} onClick={() => setMonth(addMonths(month, -1))}>
                <path d="M15 6l-6 6 6 6" />
              </MonthButton>
              <p className="font-semibold capitalize">{monthLabel.format(month)}</p>
              <MonthButton label={t("pickerNextMonth")} onClick={() => setMonth(addMonths(month, 1))}>
                <path d="M9 6l6 6-6 6" />
              </MonthButton>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-medium text-stone-500">
              {days.slice(0, 7).map((day) => (
                <span key={day.toISOString()} className="py-1 uppercase" aria-hidden="true">
                  {narrowWeekday.format(day)}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {days.map((day) => {
                const iso = format(day, "yyyy-MM-dd");
                const selected = iso === draft.date;
                return (
                  <button
                    key={iso}
                    type="button"
                    aria-label={longDate.format(day)}
                    aria-pressed={selected}
                    onClick={() => {
                      setDraft({ ...draft, date: iso });
                      setStep("hour");
                    }}
                    className={cn(
                      "mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm tabular-nums transition",
                      selected
                        ? "bg-stone-900 font-semibold text-white"
                        : isToday(day)
                          ? "font-semibold ring-1 ring-stone-900 hover:bg-stone-100"
                          : "hover:bg-stone-100",
                      !selected && !isSameMonth(day, month) && "text-stone-300",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            {/* Big readout; tap the hours or minutes to change them. */}
            <div className="mb-4 flex items-center justify-center gap-1 text-5xl font-light tabular-nums">
              <button
                type="button"
                onClick={() => setStep("hour")}
                aria-label={`${t("pickerHours")} ${draft.hour}`}
                className={cn("rounded-lg px-2", step === "hour" ? "bg-stone-100 text-stone-900" : "text-stone-400")}
              >
                {draft.hour}
              </button>
              <span className="text-stone-400">:</span>
              <button
                type="button"
                onClick={() => setStep("minute")}
                aria-label={`${t("pickerMinutes")} ${draft.minute}`}
                className={cn("rounded-lg px-2", step === "minute" ? "bg-stone-100 text-stone-900" : "text-stone-400")}
              >
                {draft.minute}
              </button>
            </div>
            <ClockDial
              mode={step === "hour" ? "hour" : "minute"}
              label={step === "hour" ? t("pickerHours") : t("pickerMinutes")}
              value={Number(step === "hour" ? draft.hour : draft.minute)}
              onChange={(next) => {
                const text = String(next).padStart(2, "0");
                setDraft((current) => (step === "hour" ? { ...current, hour: text } : { ...current, minute: text }));
              }}
              onPicked={(next) => {
                const text = String(next).padStart(2, "0");
                if (step === "hour") {
                  setDraft((current) => ({ ...current, hour: text }));
                  setStep("minute");
                } else {
                  commit({ ...draft, minute: text });
                }
              }}
            />
          </div>
        )}
      </Sheet>
    </div>
  );
}

function PickerTab({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "-mb-px truncate border-b-2 px-2 pb-2.5 text-sm font-semibold transition",
        selected ? "border-stone-900 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800",
      )}
    >
      {children}
    </button>
  );
}


function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-stone-500" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-stone-500" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
