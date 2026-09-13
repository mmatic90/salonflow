"use client";

import { ChevronDown, Clock3 } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";

type Props = {
  value: string;
  onChange: (value: string) => void;
  locale?: AppLocale;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
};

function buildTimes(startHour: number, endHour: number, intervalMinutes: number) {
  const result: string[] = [];
  for (
    let minutes = startHour * 60;
    minutes <= endHour * 60 + 45;
    minutes += intervalMinutes
  ) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    if (hour > 23) break;
    result.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return result;
}

function placeholder(locale: AppLocale) {
  if (locale === "en") return "Choose time";
  if (locale === "it") return "Scegli l'orario";
  return "Odaberite vrijeme";
}

export default function AppointmentTimeSelect({
  value,
  onChange,
  locale = "hr",
  name = "start_time",
  required = false,
  disabled = false,
  className = "",
  startHour = 6,
  endHour = 22,
  intervalMinutes = 15,
}: Props) {
  const generated = buildTimes(startHour, endHour, intervalMinutes);
  const normalizedValue = value.slice(0, 5);
  const options = normalizedValue && !generated.includes(normalizedValue)
    ? [...generated, normalizedValue].sort()
    : generated;

  return (
    <div className={`relative ${className}`}>
      <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
      <select
        name={name}
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className="w-full appearance-none rounded-xl border border-app-soft bg-white py-3 pl-11 pr-11 text-app-text shadow-sm outline-none transition hover:border-app-accent/40 focus:border-app-accent focus:ring-4 focus:ring-app-accent/10 disabled:cursor-not-allowed disabled:bg-app-bg disabled:text-app-muted"
      >
        <option value="" disabled>
          {placeholder(locale)}
        </option>
        {options.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
    </div>
  );
}
