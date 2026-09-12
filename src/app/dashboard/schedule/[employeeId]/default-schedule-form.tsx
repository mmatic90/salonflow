"use client";

import { useActionState, useMemo, useState } from "react";
import {
  updateDefaultScheduleAction,
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

const dayRows = [
  { value: 1, label: "Ponedjeljak" },
  { value: 2, label: "Utorak" },
  { value: 3, label: "Srijeda" },
  { value: 4, label: "Četvrtak" },
  { value: 5, label: "Petak" },
  { value: 6, label: "Subota" },
  { value: 0, label: "Nedjelja" },
];

export default function DefaultScheduleForm({
  employeeId,
  defaultSchedule,
  salonHours,
}: Props) {
  const initialState: ScheduleActionState = {
    error: "",
    success: "",
  };

  const boundAction = updateDefaultScheduleAction.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const initialWorkingMap = useMemo(() => {
    return dayRows.reduce<Record<number, boolean>>((acc, row) => {
      const item = defaultSchedule.find(
        (schedule) => schedule.day_of_week === row.value,
      );
      const salonDay = salonHours.find(
        (salonHour) => salonHour.day_of_week === row.value,
      );
      acc[row.value] =
        salonDay?.is_closed || !salonDay ? false : (item?.is_working ?? false);
      return acc;
    }, {});
  }, [defaultSchedule, salonHours]);

  const [workingMap, setWorkingMap] =
    useState<Record<number, boolean>>(initialWorkingMap);

  return (
    <form action={formAction} className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-app-soft">
        <table className="min-w-full border-collapse">
          <thead className="bg-app-table-head">
            <tr className="text-left text-sm text-app-muted">
              <th className="px-4 py-3 font-semibold">Dan</th>
              <th className="px-4 py-3 font-semibold">Radi</th>
              <th className="px-4 py-3 font-semibold">Početak</th>
              <th className="px-4 py-3 font-semibold">Kraj</th>
            </tr>
          </thead>

          <tbody>
            {dayRows.map(({ label, value }) => {
              const item = defaultSchedule.find(
                (row) => row.day_of_week === value,
              );
              const salonDay = salonHours.find(
                (row) => row.day_of_week === value,
              );
              const salonClosed = !salonDay || salonDay.is_closed;
              const isWorking = salonClosed ? false : (workingMap[value] ?? false);

              return (
                <tr
                  key={value}
                  className="border-t border-app-soft text-sm transition hover:bg-app-card-alt"
                >
                  <td className="px-4 py-4 font-medium text-app-text">
                    {label}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name={`is_working_${value}`}
                        checked={isWorking}
                        disabled={salonClosed}
                        onChange={(e) =>
                          setWorkingMap((prev) => ({
                            ...prev,
                            [value]: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-app-soft accent-app-accent disabled:cursor-not-allowed disabled:opacity-40"
                      />
                      {salonClosed ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          Salon je zatvoren
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <input
                      type="time"
                      name={`start_time_${value}`}
                      defaultValue={
                        item?.is_working ? item.start_time.slice(0, 5) : ""
                      }
                      disabled={!isWorking || salonClosed}
                      className="rounded-xl border border-app-soft bg-white px-3 py-2 text-app-text outline-none disabled:cursor-not-allowed disabled:bg-app-card-alt disabled:text-app-muted"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <input
                      type="time"
                      name={`end_time_${value}`}
                      defaultValue={
                        item?.is_working ? item.end_time.slice(0, 5) : ""
                      }
                      disabled={!isWorking || salonClosed}
                      className="rounded-xl border border-app-soft bg-white px-3 py-2 text-app-text outline-none disabled:cursor-not-allowed disabled:bg-app-card-alt disabled:text-app-muted"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
          className="rounded-xl bg-app-accent px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Spremanje..." : "Spremi default raspored"}
        </button>
      </div>
    </form>
  );
}
