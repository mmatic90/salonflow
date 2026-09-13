"use client";

import { useActionState, useMemo, useState } from "react";
import { Clock3, Coffee } from "lucide-react";
import AppointmentTimeSelect from "@/components/appointment-time-select";
import {
  updateDefaultScheduleAction,
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
      working: "Working",
      off: "Not working",
      break: "Break / split shift",
      breakHelp: "Appointments cannot be booked during this interval.",
      breakStart: "Break starts",
      breakEnd: "Break ends",
    };
  }
  if (locale === "it") {
    return {
      working: "Lavora",
      off: "Non lavora",
      break: "Pausa / turno spezzato",
      breakHelp: "Durante questo intervallo non possono essere prenotati appuntamenti.",
      breakStart: "Inizio pausa",
      breakEnd: "Fine pausa",
    };
  }
  return {
    working: "Radi",
    off: "Ne radi",
    break: "Pauza / dvokratno",
    breakHelp: "Tijekom ovog raspona nije moguće rezervirati termin.",
    breakStart: "Početak pauze",
    breakEnd: "Kraj pauze",
  };
}

export default function DefaultScheduleForm({
  locale = "hr",
  employeeId,
  defaultSchedule,
  salonHours,
}: Props) {
  const t = getDictionary(locale).schedule;
  const ui = copy(locale);
  const dayRows = dayValues.map((value) => ({ value, label: t.days[value] }));
  const initialState: ScheduleActionState = { error: "", success: "" };
  const boundAction = updateDefaultScheduleAction.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const initialWorkingMap = useMemo(() => {
    return dayValues.reduce<Record<number, boolean>>((acc, value) => {
      const item = defaultSchedule.find((schedule) => schedule.day_of_week === value);
      const salonDay = salonHours.find((salonHour) => salonHour.day_of_week === value);
      acc[value] = salonDay?.is_closed || !salonDay ? false : (item?.is_working ?? false);
      return acc;
    }, {});
  }, [defaultSchedule, salonHours]);

  const initialStartMap = useMemo(
    () =>
      dayValues.reduce<Record<number, string>>((acc, value) => {
        const item = defaultSchedule.find((schedule) => schedule.day_of_week === value);
        acc[value] = item?.is_working ? item.start_time.slice(0, 5) : "09:00";
        return acc;
      }, {}),
    [defaultSchedule],
  );
  const initialEndMap = useMemo(
    () =>
      dayValues.reduce<Record<number, string>>((acc, value) => {
        const item = defaultSchedule.find((schedule) => schedule.day_of_week === value);
        acc[value] = item?.is_working ? item.end_time.slice(0, 5) : "17:00";
        return acc;
      }, {}),
    [defaultSchedule],
  );
  const initialBreakMap = useMemo(
    () =>
      dayValues.reduce<Record<number, boolean>>((acc, value) => {
        const item = defaultSchedule.find((schedule) => schedule.day_of_week === value);
        acc[value] = Boolean(item?.break_start_time && item?.break_end_time);
        return acc;
      }, {}),
    [defaultSchedule],
  );
  const initialBreakStartMap = useMemo(
    () =>
      dayValues.reduce<Record<number, string>>((acc, value) => {
        const item = defaultSchedule.find((schedule) => schedule.day_of_week === value);
        acc[value] = item?.break_start_time?.slice(0, 5) ?? "12:00";
        return acc;
      }, {}),
    [defaultSchedule],
  );
  const initialBreakEndMap = useMemo(
    () =>
      dayValues.reduce<Record<number, string>>((acc, value) => {
        const item = defaultSchedule.find((schedule) => schedule.day_of_week === value);
        acc[value] = item?.break_end_time?.slice(0, 5) ?? "13:00";
        return acc;
      }, {}),
    [defaultSchedule],
  );

  const [workingMap, setWorkingMap] = useState<Record<number, boolean>>(initialWorkingMap);
  const [startMap, setStartMap] = useState<Record<number, string>>(initialStartMap);
  const [endMap, setEndMap] = useState<Record<number, string>>(initialEndMap);
  const [breakMap, setBreakMap] = useState<Record<number, boolean>>(initialBreakMap);
  const [breakStartMap, setBreakStartMap] = useState<Record<number, string>>(
    initialBreakStartMap,
  );
  const [breakEndMap, setBreakEndMap] = useState<Record<number, string>>(
    initialBreakEndMap,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3">
        {dayRows.map(({ label, value }) => {
          const salonDay = salonHours.find((row) => row.day_of_week === value);
          const salonClosed = !salonDay || salonDay.is_closed;
          const isWorking = salonClosed ? false : (workingMap[value] ?? false);
          const hasBreak = isWorking && (breakMap[value] ?? false);

          return (
            <article
              key={value}
              className={`rounded-2xl border bg-white p-4 ${
                salonClosed ? "border-app-soft/70 opacity-70" : "border-app-soft"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-app-text">{label}</h3>
                  <p className={`mt-1 text-xs font-semibold ${isWorking ? "text-emerald-700" : "text-app-muted"}`}>
                    {salonClosed ? t.salonClosed : isWorking ? ui.working : ui.off}
                  </p>
                </div>

                <label className={`relative inline-flex ${salonClosed ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    name={`is_working_${value}`}
                    checked={isWorking}
                    disabled={salonClosed}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setWorkingMap((prev) => ({ ...prev, [value]: checked }));
                      if (!checked) {
                        setBreakMap((prev) => ({ ...prev, [value]: false }));
                      }
                    }}
                    className="sr-only"
                  />
                  <span
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
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
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-app-text">
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-app-muted" /> {t.start}
                  </span>
                  <AppointmentTimeSelect
                    locale={locale}
                    name={`start_time_${value}`}
                    value={startMap[value] ?? ""}
                    onChange={(next) =>
                      setStartMap((prev) => ({ ...prev, [value]: next }))
                    }
                    disabled={!isWorking || salonClosed}
                    startHour={5}
                    endHour={22}
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-app-text">
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-app-muted" /> {t.end}
                  </span>
                  <AppointmentTimeSelect
                    locale={locale}
                    name={`end_time_${value}`}
                    value={endMap[value] ?? ""}
                    onChange={(next) =>
                      setEndMap((prev) => ({ ...prev, [value]: next }))
                    }
                    disabled={!isWorking || salonClosed}
                    startHour={6}
                    endHour={23}
                  />
                </label>
              </div>

              {isWorking ? (
                <div className="mt-4 rounded-xl border border-app-soft bg-app-card-alt/45 p-3.5">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-app-text">
                        <Coffee className="h-4 w-4 text-app-muted" /> {ui.break}
                      </p>
                      <p className="mt-1 text-xs text-app-muted">{ui.breakHelp}</p>
                    </div>
                    <input
                      type="checkbox"
                      name={`has_break_${value}`}
                      checked={hasBreak}
                      onChange={(event) =>
                        setBreakMap((prev) => ({
                          ...prev,
                          [value]: event.target.checked,
                        }))
                      }
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
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5 text-sm font-medium text-app-text">
                        <span>{ui.breakStart}</span>
                        <AppointmentTimeSelect
                          locale={locale}
                          name={`break_start_time_${value}`}
                          value={breakStartMap[value] ?? ""}
                          onChange={(next) =>
                            setBreakStartMap((prev) => ({ ...prev, [value]: next }))
                          }
                          required
                          startHour={5}
                          endHour={22}
                        />
                      </label>
                      <label className="space-y-1.5 text-sm font-medium text-app-text">
                        <span>{ui.breakEnd}</span>
                        <AppointmentTimeSelect
                          locale={locale}
                          name={`break_end_time_${value}`}
                          value={breakEndMap[value] ?? ""}
                          onChange={(next) =>
                            setBreakEndMap((prev) => ({ ...prev, [value]: next }))
                          }
                          required
                          startHour={5}
                          endHour={22}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

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
          {pending ? getDictionary(locale).settings.saving : t.saveDefault}
        </button>
      </div>
    </form>
  );
}
