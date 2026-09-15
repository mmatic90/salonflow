"use client";

import { useActionState, useMemo, useState } from "react";
import { Coffee } from "lucide-react";
import AppointmentTimeSelect from "@/components/appointment-time-select";
import {
  applyDefaultScheduleRangeAction,
  type ScheduleActionState,
} from "@/features/schedule/actions";
import type {
  EmployeeDefaultScheduleItem,
  SalonScheduleHourItem,
} from "@/features/schedule/types";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  employeeId: string;
  defaultSchedule: EmployeeDefaultScheduleItem[];
  salonHours: SalonScheduleHourItem[];
};

const dayValues = [1, 2, 3, 4, 5, 6, 0];

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      break: "Add a break / split shift",
      breakHelp: "Apply the same break to all selected working days.",
      breakStart: "Break starts",
      breakEnd: "Break ends",
    };
  }
  if (locale === "it") {
    return {
      break: "Aggiungi pausa / turno spezzato",
      breakHelp: "Applica la stessa pausa a tutti i giorni lavorativi selezionati.",
      breakStart: "Inizio pausa",
      breakEnd: "Fine pausa",
    };
  }
  return {
    break: "Dodaj pauzu / dvokratno",
    breakHelp: "Primijeni istu pauzu na sve odabrane radne dane.",
    breakStart: "Početak pauze",
    breakEnd: "Kraj pauze",
  };
}

export default function DefaultScheduleRangeForm({
  locale = "hr",
  employeeId,
  defaultSchedule,
  salonHours,
}: Props) {
  const t = getDictionary(locale).schedule;
  const ui = copy(locale);
  const dayOptions = dayValues.map((value) => ({ value, label: t.days[value] }));
  const initialState: ScheduleActionState = { error: "", success: "" };
  const boundAction = applyDefaultScheduleRangeAction.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const suggestedRange = useMemo(() => {
    const workingDays = defaultSchedule.filter((item) => item.is_working);
    if (workingDays.length === 0) {
      return {
        dayFrom: 1,
        dayTo: 5,
        isWorking: true,
        startTime: "08:00",
        endTime: "16:00",
        hasBreak: false,
        breakStartTime: "12:00",
        breakEndTime: "13:00",
      };
    }
    const first = workingDays[0];
    return {
      dayFrom: Math.min(...workingDays.map((item) => item.day_of_week)),
      dayTo: Math.max(...workingDays.map((item) => item.day_of_week)),
      isWorking: true,
      startTime: first.start_time.slice(0, 5),
      endTime: first.end_time.slice(0, 5),
      hasBreak: Boolean(first.break_start_time && first.break_end_time),
      breakStartTime: first.break_start_time?.slice(0, 5) ?? "12:00",
      breakEndTime: first.break_end_time?.slice(0, 5) ?? "13:00",
    };
  }, [defaultSchedule]);

  const [isWorking, setIsWorking] = useState(suggestedRange.isWorking);
  const [startTime, setStartTime] = useState(suggestedRange.startTime);
  const [endTime, setEndTime] = useState(suggestedRange.endTime);
  const [hasBreak, setHasBreak] = useState(suggestedRange.hasBreak);
  const [breakStartTime, setBreakStartTime] = useState(suggestedRange.breakStartTime);
  const [breakEndTime, setBreakEndTime] = useState(suggestedRange.breakEndTime);

  const closedDays = dayOptions.filter((day) => {
    const salonDay = salonHours.find((item) => item.day_of_week === day.value);
    return !salonDay || salonDay.is_closed;
  });

  return (
    <form action={formAction} className="space-y-5">
      {closedDays.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.closedDaysNotice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-app-text">
          <span>{t.fromDay}</span>
          <select
            name="day_from"
            defaultValue={String(suggestedRange.dayFrom)}
            className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
          >
            {dayOptions.map((day) => {
              const salonDay = salonHours.find((item) => item.day_of_week === day.value);
              const closed = !salonDay || salonDay.is_closed;
              return (
                <option key={day.value} value={day.value} disabled={closed}>
                  {day.label}{closed ? " — " + t.salonClosedSuffix : ""}
                </option>
              );
            })}
          </select>
        </label>

        <label className="space-y-1.5 text-sm font-medium text-app-text">
          <span>{t.toDay}</span>
          <select
            name="day_to"
            defaultValue={String(suggestedRange.dayTo)}
            className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
          >
            {dayOptions.map((day) => {
              const salonDay = salonHours.find((item) => item.day_of_week === day.value);
              const closed = !salonDay || salonDay.is_closed;
              return (
                <option key={day.value} value={day.value} disabled={closed}>
                  {day.label}{closed ? " — " + t.salonClosedSuffix : ""}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-app-soft bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-app-text">{t.worksInRange}</p>
          <p className="mt-1 text-xs text-app-muted">{isWorking ? t.customHours : t.dayOff}</p>
        </div>
        <input
          type="checkbox"
          name="range_is_working"
          checked={isWorking}
          onChange={(event) => {
            setIsWorking(event.target.checked);
            if (!event.target.checked) setHasBreak(false);
          }}
          className="sr-only"
        />
        <span
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
            isWorking ? "bg-app-accent" : "bg-app-soft"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              isWorking ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </span>
      </label>

      {isWorking ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-app-text">
              <span>{t.start}</span>
              <AppointmentTimeSelect
                locale={locale}
                name="range_start_time"
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
                name="range_end_time"
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
                name="range_has_break"
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
                    name="range_break_start_time"
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
                    name="range_break_end_time"
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
          disabled={pending}
          className="rounded-xl bg-app-accent px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? t.applying : t.applyRange}
        </button>
      </div>
    </form>
  );
}
