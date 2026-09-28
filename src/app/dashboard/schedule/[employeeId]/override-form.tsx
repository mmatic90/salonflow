"use client";

import { useActionState, useMemo, useState } from "react";
import { Coffee } from "lucide-react";
import AppointmentTimeSelect from "@/components/appointment-time-select";
import {
  createScheduleOverrideAction,
  type ScheduleActionState,
} from "@/features/schedule/actions";
import type { SalonScheduleHourItem } from "@/features/schedule/types";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  employeeId: string;
  salonHours: SalonScheduleHourItem[];
};

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      break: "Break / split shift",
      breakHelp: "Appointments will be blocked during this interval.",
      breakStart: "Break starts",
      breakEnd: "Break ends",
    };
  }
  if (locale === "it") {
    return {
      break: "Pausa / turno spezzato",
      breakHelp: "Gli appuntamenti saranno bloccati durante questo intervallo.",
      breakStart: "Inizio pausa",
      breakEnd: "Fine pausa",
    };
  }
  return {
    break: "Pauza / dvokratno",
    breakHelp: "Termini će biti blokirani tijekom ovog raspona.",
    breakStart: "Početak pauze",
    breakEnd: "Kraj pauze",
  };
}

export default function OverrideForm({ locale = "hr", employeeId, salonHours }: Props) {
  const t = getDictionary(locale).schedule;
  const ui = copy(locale);
  const [overrideType, setOverrideType] = useState("custom_hours");
  const today = useMemo(() => getTodayLocalDate(), []);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [hasBreak, setHasBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState("12:00");
  const [breakEndTime, setBreakEndTime] = useState("13:00");
  const initialState: ScheduleActionState = { error: "", success: "" };
  const boundAction = createScheduleOverrideAction.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const rangeIncludesClosedSalonDay = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    const start = new Date(`${dateFrom}T00:00:00`);
    const end = new Date(`${dateTo}T00:00:00`);
    const current = new Date(start);
    while (current <= end) {
      const salonDay = salonHours.find(
        (item) => item.day_of_week === current.getDay(),
      );
      if (!salonDay || salonDay.is_closed) return true;
      current.setDate(current.getDate() + 1);
    }
    return false;
  }, [dateFrom, dateTo, salonHours]);

  const overrideOptions = [
    { value: "custom_hours", label: t.customHours },
    { value: "day_off", label: t.dayOff },
    { value: "vacation", label: t.vacation },
    { value: "sick_leave", label: t.sickLeave },
  ];

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-app-text">
          <span>{t.fromDate}</span>
          <input
            name="date_from"
            type="date"
            value={dateFrom}
            onChange={(event) => {
              const next = event.target.value;
              setDateFrom(next);
              if (!dateTo || dateTo < next) setDateTo(next);
            }}
            className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
            required
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-app-text">
          <span>{t.toDate}</span>
          <input
            name="date_to"
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(event) => setDateTo(event.target.value)}
            className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
            required
          />
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-app-text">{t.overrideType}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {overrideOptions.map((option) => {
            const active = overrideType === option.value;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-app-accent bg-app-accent/5 text-app-text"
                    : "border-app-soft bg-white text-app-muted hover:bg-app-bg"
                }`}
              >
                <input
                  type="radio"
                  name="override_type"
                  value={option.value}
                  checked={active}
                  onChange={() => {
                    setOverrideType(option.value);
                    if (option.value !== "custom_hours") setHasBreak(false);
                  }}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </div>

      {overrideType === "custom_hours" && rangeIncludesClosedSalonDay ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.closedRangeWarning}
        </div>
      ) : null}

      {overrideType === "custom_hours" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-app-text">
              <span>{t.start}</span>
              <AppointmentTimeSelect
                locale={locale}
                name="start_time"
                value={startTime}
                onChange={setStartTime}
                required
                startHour={5}
                endHour={22}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-app-text">
              <span>{t.end}</span>
              <AppointmentTimeSelect
                locale={locale}
                name="end_time"
                value={endTime}
                onChange={setEndTime}
                required
                startHour={6}
                endHour={23}
              />
            </label>
          </div>

          <div className="rounded-xl border border-app-soft bg-app-card-alt/45 p-4">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-app-text">
                  <Coffee className="h-4 w-4 text-app-muted" /> {ui.break}
                </p>
                <p className="mt-1 text-xs text-app-muted">{ui.breakHelp}</p>
              </div>
              <input
                type="checkbox"
                name="has_break"
                checked={hasBreak}
                onChange={(event) => setHasBreak(event.target.checked)}
                className="sr-only"
              />
              <span
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                  hasBreak ? "bg-app-accent" : "bg-app-soft"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    hasBreak ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
            </label>

            {hasBreak ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-app-text">
                  <span>{ui.breakStart}</span>
                  <AppointmentTimeSelect
                    locale={locale}
                    name="break_start_time"
                    value={breakStartTime}
                    onChange={setBreakStartTime}
                    required
                    startHour={5}
                    endHour={22}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-app-text">
                  <span>{ui.breakEnd}</span>
                  <AppointmentTimeSelect
                    locale={locale}
                    name="break_end_time"
                    value={breakEndTime}
                    onChange={setBreakEndTime}
                    required
                    startHour={5}
                    endHour={22}
                  />
                </label>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <label className="block space-y-1.5 text-sm font-medium text-app-text">
        <span>{t.note}</span>
        <textarea
          name="note"
          rows={3}
          className="w-full resize-none rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
        />
      </label>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {state.success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            pending ||
            (overrideType === "custom_hours" && rangeIncludesClosedSalonDay)
          }
          className="rounded-xl bg-app-accent px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? getDictionary(locale).settings.saving : t.addOverrideRange}
        </button>
      </div>
    </form>
  );
}
