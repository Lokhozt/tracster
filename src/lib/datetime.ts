import { addHours, format } from "date-fns";

const DATE_TIME_FORMAT = "dd MMM yyyy, HH:mm";
const DATE_INPUT_FORMAT = "yyyy-MM-dd";

export type DateTimeParts = {
  date: string;
  hour: string;
  minute: string;
};

export function formatDateTime(date: Date): string {
  return format(date, DATE_TIME_FORMAT);
}

export function dateToDateTimeParts(date: Date): DateTimeParts {
  return {
    date: format(date, DATE_INPUT_FORMAT),
    hour: format(date, "HH"),
    minute: format(date, "mm"),
  };
}

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function formatCalendarDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayDateInputValue(): string {
  return format(new Date(), DATE_INPUT_FORMAT);
}

export function defaultStartDateTime(): DateTimeParts {
  return {
    date: todayDateInputValue(),
    hour: "18",
    minute: "00",
  };
}

export function combineDateAndTime(date: string, hour: string, minute: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, Number(hour), Number(minute), 0, 0);
}

export function dateTimePartsToDate(parts: DateTimeParts): Date | null {
  if (!parts.date || parts.hour === "" || parts.minute === "") {
    return null;
  }

  return combineDateAndTime(parts.date, parts.hour, parts.minute);
}

export function addOneHour(parts: DateTimeParts): DateTimeParts {
  const date = dateTimePartsToDate(parts);
  if (!date) {
    return parts;
  }

  const next = addHours(date, 1);
  return {
    date: format(next, DATE_INPUT_FORMAT),
    hour: format(next, "HH"),
    minute: format(next, "mm"),
  };
}

export function readDateTimeFromForm(
  formData: FormData,
  prefix: string,
): Date | null {
  const date = String(formData.get(`${prefix}Date`) ?? "");
  const hour = String(formData.get(`${prefix}Hour`) ?? "");
  const minute = String(formData.get(`${prefix}Minute`) ?? "");

  if (!date || hour === "" || minute === "") {
    return null;
  }

  return combineDateAndTime(date, hour, minute);
}

export const HOURS_24 = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);

export const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);
