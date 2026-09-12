"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import type { SalonWorkingHourItem } from "@/features/settings/types";
import { bulkUpdateSalonWorkingHoursAction } from "@/features/settings/actions";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  hours: SalonWorkingHourItem[];
};

type EditableHour = {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

const dayValues = [1, 2, 3, 4, 5, 6, 0];

function toEditable(
  rows: SalonWorkingHourItem[],
  dayOfWeek: number,
): EditableHour {
  const row = rows.find((item) => item.day_of_week === dayOfWeek);

  return {
    day_of_week: dayOfWeek,
    opens_at: row?.opens_at?.slice(0, 5) || "09:00",
    closes_at: row?.closes_at?.slice(0, 5) || "19:00",
    is_closed: row?.is_closed ?? false,
  };
}

export default function SalonHoursTable({ locale = "hr", hours }: Props) {
  const t = getDictionary(locale).settings;
  const dayRows = dayValues.map((value) => ({ value, label: t.salonHours.days[value] }));
  const initialItems = useMemo(
    () => dayValues.map((day) => toEditable(hours, day)),
    [hours],
  );

  const [items, setItems] = useState<EditableHour[]>(initialItems);
  const [pending, startTransition] = useTransition();

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);

  function updateItem(
    dayOfWeek: number,
    field: keyof EditableHour,
    value: string | boolean,
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.day_of_week === dayOfWeek ? { ...item, [field]: value } : item,
      ),
    );
  }

  function resetChanges() {
    setItems(initialItems);
  }

  function saveChanges() {
    startTransition(async () => {
      const result = await bulkUpdateSalonWorkingHoursAction(items);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-app-muted">
          {t.salonHours.editHint}{" "}
          <span className="font-medium text-app-text">{t.saveChanges}</span>.
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetChanges}
            disabled={pending || !hasChanges}
            className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </button>

          <button
            type="button"
            onClick={saveChanges}
            disabled={pending || !hasChanges}
            className="rounded-xl bg-app-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.saving : t.saveChanges}
          </button>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full border-collapse">
          <thead className="bg-app-table-head">
            <tr className="text-left text-sm text-app-muted">
              <th className="px-4 py-3 font-semibold">{t.salonHours.day}</th>
              <th className="px-4 py-3 font-semibold">{t.salonHours.closed}</th>
              <th className="px-4 py-3 font-semibold">{t.salonHours.opens}</th>
              <th className="px-4 py-3 font-semibold">{t.salonHours.closes}</th>
            </tr>
          </thead>

          <tbody>
            {dayRows.map((day) => {
              const item = items.find((row) => row.day_of_week === day.value)!;

              return (
                <tr
                  key={day.value}
                  className="border-t border-app-soft text-sm transition hover:bg-app-card-alt"
                >
                  <td className="px-4 py-4 font-medium text-app-text">
                    {day.label}
                  </td>

                  <td className="px-4 py-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!item.is_closed}
                      onClick={() =>
                        updateItem(day.value, "is_closed", !item.is_closed)
                      }
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                        item.is_closed ? "bg-app-soft" : "bg-app-accent"
                      }`}
                      title={item.is_closed ? t.salonHours.closed : t.salonHours.open}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          item.is_closed ? "translate-x-1" : "translate-x-6"
                        }`}
                      />
                    </button>
                  </td>

                  <td className="px-4 py-4">
                    <input
                      type="time"
                      value={item.opens_at}
                      disabled={item.is_closed}
                      onChange={(e) =>
                        updateItem(day.value, "opens_at", e.target.value)
                      }
                      className="rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none disabled:bg-app-card-alt disabled:text-app-muted"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <input
                      type="time"
                      value={item.closes_at}
                      disabled={item.is_closed}
                      onChange={(e) =>
                        updateItem(day.value, "closes_at", e.target.value)
                      }
                      className="rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none disabled:bg-app-card-alt disabled:text-app-muted"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {dayRows.map((day) => {
          const item = items.find((row) => row.day_of_week === day.value)!;

          return (
            <div
              key={day.value}
              className="rounded-2xl border border-app-soft bg-white p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="font-medium text-app-text">{day.label}</div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={!item.is_closed}
                  onClick={() =>
                    updateItem(day.value, "is_closed", !item.is_closed)
                  }
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    item.is_closed ? "bg-app-soft" : "bg-app-accent"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      item.is_closed ? "translate-x-1" : "translate-x-6"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-3 grid gap-3">
                <div>
                  <label className="mb-1 block text-sm text-app-muted">
                    {t.salonHours.opens}
                  </label>
                  <input
                    type="time"
                    value={item.opens_at}
                    disabled={item.is_closed}
                    onChange={(e) =>
                      updateItem(day.value, "opens_at", e.target.value)
                    }
                    className="w-full rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none disabled:bg-app-card-alt disabled:text-app-muted"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-app-muted">
                    {t.salonHours.closes}
                  </label>
                  <input
                    type="time"
                    value={item.closes_at}
                    disabled={item.is_closed}
                    onChange={(e) =>
                      updateItem(day.value, "closes_at", e.target.value)
                    }
                    className="w-full rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none disabled:bg-app-card-alt disabled:text-app-muted"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
