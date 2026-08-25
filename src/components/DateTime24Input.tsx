import type { DateTimeParts } from "@/lib/datetime";
import { HOURS_24, MINUTES } from "@/lib/datetime";
import { Input, Label, Select } from "@/components/ui";

export function DateTime24Input({
  name,
  label,
  required = false,
  value,
  onChange,
}: {
  name: string;
  label: string;
  required?: boolean;
  value: DateTimeParts;
  onChange: (value: DateTimeParts) => void;
}) {
  function updateField(field: keyof DateTimeParts, fieldValue: string) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="date"
        name={`${name}Date`}
        required={required}
        value={value.date}
        onChange={(event) => updateField("date", event.target.value)}
        aria-label={`${label} date`}
      />
      <div className="flex items-center gap-2">
        <Select
          name={`${name}Hour`}
          required={required}
          value={value.hour}
          onChange={(event) => updateField("hour", event.target.value)}
          aria-label={`${label} hour`}
          className="w-20 min-h-11"
        >
          {HOURS_24.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </Select>
        <span className="text-stone-500" aria-hidden="true">
          :
        </span>
        <Select
          name={`${name}Minute`}
          required={required}
          value={value.minute}
          onChange={(event) => updateField("minute", event.target.value)}
          aria-label={`${label} minute`}
          className="w-20 min-h-11"
        >
          {MINUTES.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </Select>
        <span className="text-xs text-stone-500">24h</span>
      </div>
    </div>
  );
}
