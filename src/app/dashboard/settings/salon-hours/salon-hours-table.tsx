"use client";

import { useMemo, useState, useTransition } from "react";
import { Clock3, RotateCcw } from "lucide-react";
import AppointmentTimeSelect from "@/components/appointment-time-select";
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

function toEditable(rows: SalonWorkingHourItem[], dayOfWeek: number): EditableHour {
  const row = rows.find((item) => item.day_of_week === dayOfWeek);
  return {
    day_of_week: dayOfWeek,
    opens_at: row?.opens_at?.slice(0, 5) || "09:00",
    closes_at: row?.closes_at?.slice(0, 5) || "19:00",
    is_closed: row?.is_closed ?? false,
  };
}

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      open: "Open",
      closed: "Closed",
      help: "Set the regular opening hours. Employee schedules must stay within these hours.",
    };
  }
  if (locale === "it") {
    return {
      open: "Aperto",
      closed: "Chiuso",
      help: "Imposta l'orario regolare. I turni degli operatori devono rientrare in questo intervallo.",
    };
  }
  return {
    open: "Otvoreno",
    closed: "Zatvoreno",
    help: "Postavi redovno radno vrijeme. Smjene djelatnika moraju biti unutar ovog raspona.",
  };
}

export default function SalonHoursTable({ locale = "hr", hours }: Props) {
  const t = getDictionary(locale).settings;
  const ui = copy(locale);
  const dayRows = dayValues.map((value) => ({
    value,
    label: t.salonHours.days[value],
  }));
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-app-soft bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-app-text">{t.salonHours.editHint}</p>
          <p className="mt-1 text-xs text-app-muted">{ui.help}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setItems(initialItems)}
            disabled={pending || !hasChanges}
            className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-bg disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> {t.reset}
          </button>
          <button
            type="button"
            onClick={saveChanges}
            disabled={pending || !hasChanges}
            className="rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.saving : t.saveChanges}
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {dayRows.map((day) => {
          const item = items.find((row) => row.day_of_week === day.value)!;
          return (
            <article
              key={day.value}
              className={`rounded-2xl border bg-white p-4 transition ${
                item.is_closed ? "border-app-soft/70 opacity-75" : "border-app-soft"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-app-text">{day.label}</h3>
                  <p className={`mt-1 text-xs font-semibold ${item.is_closed ? "text-app-muted" : "text-emerald-700"}`}>
                    {item.is_closed ? ui.closed : ui.open}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!item.is_closed}
                  onClick={() =>
                    updateItem(day.value, "is_closed", !item.is_closed)
                  }
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
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

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-app-text">
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-app-muted" /> {t.salonHours.opens}
                  </span>
                  <AppointmentTimeSelect
                    locale={locale}
                    name={`opens_${day.value}`}
                    value={item.opens_at}
                    onChange={(value) => updateItem(day.value, "opens_at", value)}
                    disabled={item.is_closed}
                    startHour={5}
                    endHour={22}
                    intervalMinutes={15}
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-app-text">
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-app-muted" /> {t.salonHours.closes}
                  </span>
                  <AppointmentTimeSelect
                    locale={locale}
                    name={`closes_${day.value}`}
                    value={item.closes_at}
                    onChange={(value) => updateItem(day.value, "closes_at", value)}
                    disabled={item.is_closed}
                    startHour={6}
                    endHour={23}
                    intervalMinutes={15}
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
