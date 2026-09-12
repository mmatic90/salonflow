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

type Props = {
  employeeId: string;
  defaultSchedule: EmployeeDefaultScheduleItem[];
  salonHours: SalonScheduleHourItem[];
};

const dayOptions = [
  { value: 1, label: "Ponedjeljak" },
  { value: 2, label: "Utorak" },
  { value: 3, label: "Srijeda" },
  { value: 4, label: "Četvrtak" },
  { value: 5, label: "Petak" },
  { value: 6, label: "Subota" },
  { value: 0, label: "Nedjelja" },
];

export default function DefaultScheduleRangeForm({
  employeeId,
  defaultSchedule,
  salonHours,
}: Props) {
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
          Zatvoreni dani salona ne mogu se uključiti u radni raspored zaposlenika.
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="day_from" className="mb-1 block text-sm font-medium">
            Od dana
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
                  {day.label}{closed ? " — salon zatvoren" : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label htmlFor="day_to" className="mb-1 block text-sm font-medium">
            Do dana
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
                  {day.label}{closed ? " — salon zatvoren" : ""}
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
        Radi u ovom rasponu dana
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="range_start_time"
            className="mb-1 block text-sm font-medium"
          >
            Početak
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
            Kraj
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
          {pending ? "Primjenjujem..." : "Primijeni na raspon dana"}
        </button>
      </div>
    </form>
  );
}
