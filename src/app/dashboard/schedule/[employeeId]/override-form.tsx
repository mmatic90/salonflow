"use client";

import { useActionState, useMemo, useState } from "react";
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

export default function OverrideForm({ locale = "hr", employeeId, salonHours }: Props) {
  const t = getDictionary(locale).schedule;
  const [overrideType, setOverrideType] = useState("custom_hours");
  const today = useMemo(() => getTodayLocalDate(), []);

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const initialState: ScheduleActionState = {
    error: "",
    success: "",
  };

  const boundAction = createScheduleOverrideAction.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

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

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="date_from" className="mb-1 block text-sm font-medium">
            {t.fromDate}
          </label>
          <input
            id="date_from"
            name="date_from"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              const newValue = e.target.value;
              setDateFrom(newValue);
              setDateTo(newValue);
            }}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
            required
          />
        </div>

        <div>
          <label htmlFor="date_to" className="mb-1 block text-sm font-medium">
            {t.toDate}
          </label>
          <input
            id="date_to"
            name="date_to"
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="override_type"
          className="mb-1 block text-sm font-medium"
        >
          {t.overrideType}
        </label>
        <select
          id="override_type"
          name="override_type"
          value={overrideType}
          onChange={(e) => setOverrideType(e.target.value)}
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
          required
        >
          <option value="custom_hours">{t.customHours}</option>
          <option value="day_off">{t.dayOff}</option>
          <option value="vacation">{t.vacation}</option>
          <option value="sick_leave">{t.sickLeave}</option>
        </select>
      </div>

      {overrideType === "custom_hours" && rangeIncludesClosedSalonDay ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.closedRangeWarning}
        </div>
      ) : null}

      {overrideType === "custom_hours" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="start_time"
              className="mb-1 block text-sm font-medium"
            >
              {t.start}
            </label>
            <input
              id="start_time"
              name="start_time"
              type="time"
              defaultValue="08:00"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
              required
            />
          </div>

          <div>
            <label
              htmlFor="end_time"
              className="mb-1 block text-sm font-medium"
            >
              {t.end}
            </label>
            <input
              id="end_time"
              name="end_time"
              type="time"
              defaultValue="16:00"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
              required
            />
          </div>
        </div>
      ) : null}

      <div>
        <label htmlFor="note" className="mb-1 block text-sm font-medium">
          {t.note}
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
        />
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
          disabled={
            pending ||
            (overrideType === "custom_hours" && rangeIncludesClosedSalonDay)
          }
          className="rounded-xl bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? getDictionary(locale).settings.saving : t.addOverrideRange}
        </button>
      </div>
    </form>
  );
}
