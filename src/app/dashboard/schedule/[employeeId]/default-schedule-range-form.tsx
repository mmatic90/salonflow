"use client";

import { useActionState, useMemo } from "react";
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

export default function DefaultScheduleRangeForm({
  locale = "hr",
  employeeId,
  defaultSchedule,
  salonHours,
}: Props) {
  const t = getDictionary(locale).schedule;
  const dayOptions = dayValues.map((value) => ({ value, label: t.days[value] }));

  const initialState: ScheduleActionState = {
    error: "",
    success: "",
  };

  const boundAction = applyDefaultScheduleRangeAction.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const suggestedRange = useMemo(() => {
    const workingDays = defaultSchedule.filter((item) => item.is_working);

    if (workingDays.length === 0) {
      return {
        dayFrom: 1,
        dayTo: 5,
        isWorking: true,
        startTime: "08:00",
        endTime: "16:00",
      };
    }

    return {
      dayFrom: Math.min(...workingDays.map((item) => item.day_of_week)),
      dayTo: Math.max(...workingDays.map((item) => item.day_of_week)),
      isWorking: true,
      startTime: workingDays[0].start_time.slice(0, 5),
      endTime: workingDays[0].end_time.slice(0, 5),
    };
  }, [defaultSchedule]);

  const closedDays = dayOptions.filter((day) => {
    const salonDay = salonHours.find((item) => item.day_of_week === day.value);
    return !salonDay || salonDay.is_closed;
  });

  return (
    <form action={formAction} className="space-y-4">
      {closedDays.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.closedDaysNotice}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="day_from" className="mb-1 block text-sm font-medium">
            {t.fromDay}
          </label>
          <select
            id="day_from"
            name="day_from"
            defaultValue={String(suggestedRange.dayFrom)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
          >
            {dayOptions.map((day) => {
              const salonDay = salonHours.find(
                (item) => item.day_of_week === day.value,
              );
              const closed = !salonDay || salonDay.is_closed;

              return (
                <option key={day.value} value={day.value} disabled={closed}>
                  {day.label}{closed ? " — " + t.salonClosedSuffix : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label htmlFor="day_to" className="mb-1 block text-sm font-medium">
            {t.toDay}
          </label>
          <select
            id="day_to"
            name="day_to"
            defaultValue={String(suggestedRange.dayTo)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
          >
            {dayOptions.map((day) => {
              const salonDay = salonHours.find(
                (item) => item.day_of_week === day.value,
              );
              const closed = !salonDay || salonDay.is_closed;

              return (
                <option key={day.value} value={day.value} disabled={closed}>
                  {day.label}{closed ? " — " + t.salonClosedSuffix : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="range_is_working"
          defaultChecked={suggestedRange.isWorking}
        />
        {t.worksInRange}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="range_start_time"
            className="mb-1 block text-sm font-medium"
          >
            {t.start}
          </label>
          <input
            id="range_start_time"
            name="range_start_time"
            type="time"
            defaultValue={suggestedRange.startTime}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="range_end_time"
            className="mb-1 block text-sm font-medium"
          >
            {t.end}
          </label>
          <input
            id="range_end_time"
            name="range_end_time"
            type="time"
            defaultValue={suggestedRange.endTime}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
          />
        </div>
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
          className="rounded-xl bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? t.applying : t.applyRange}
        </button>
      </div>
    </form>
  );
}
