"use client";

import { useMemo, useState, useTransition } from "react";
import { Clock3, CopyCheck, RotateCcw } from "lucide-react";
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
      quickTitle: "Quick setup",
      quickHelp: "Apply the same opening hours to several days, then fine-tune individual days below.",
      fromDay: "From day",
      toDay: "To day",
      apply: "Apply to selected days",
      invalidRange: "Choose a valid day range and opening hours.",
    };
  }
  if (locale === "it") {
    return {
      open: "Aperto",
      closed: "Chiuso",
      help: "Imposta l'orario regolare. I turni degli operatori devono rientrare in questo intervallo.",
      quickTitle: "Impostazione rapida",
      quickHelp: "Applica lo stesso orario a più giorni, poi modifica i singoli giorni qui sotto.",
      fromDay: "Dal giorno",
      toDay: "Al giorno",
      apply: "Applica ai giorni selezionati",
      invalidRange: "Scegli un intervallo di giorni e un orario validi.",
    };
  }
  return {
    open: "Otvoreno",
    closed: "Zatvoreno",
    help: "Postavi redovno radno vrijeme. Smjene djelatnika moraju biti unutar ovog raspona.",
    quickTitle: "Brzo postavljanje",
    quickHelp: "Primijeni isto radno vrijeme na više dana, a zatim po potrebi doradi pojedine dane ispod.",
    fromDay: "Od dana",
    toDay: "Do dana",
    apply: "Primijeni na odabrane dane",
    invalidRange: "Odaberi ispravan raspon dana i radnog vremena.",
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
  const [quickFrom, setQuickFrom] = useState(1);
  const [quickTo, setQuickTo] = useState(5);
  const [quickOpen, setQuickOpen] = useState("09:00");
  const [quickClose, setQuickClose] = useState("19:00");
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

  function applyQuickHours() {
    const fromIndex = dayValues.indexOf(quickFrom);
    const toIndex = dayValues.indexOf(quickTo);
    if (
      fromIndex < 0 ||
      toIndex < fromIndex ||
      !quickOpen ||
      !quickClose ||
      quickClose <= quickOpen
    ) {
      toast.error(ui.invalidRange);
      return;
    }

    const selectedDays = new Set(dayValues.slice(fromIndex, toIndex + 1));
    setItems((prev) =>
      prev.map((item) =>
        selectedDays.has(item.day_of_week)
          ? {
              ...item,
              opens_at: quickOpen,
              closes_at: quickClose,
              is_closed: false,
            }
          : item,
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

      <section className="rounded-2xl border border-app-soft bg-app-card-alt p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-app-muted shadow-sm">
            <CopyCheck className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-app-text">{ui.quickTitle}</h3>
            <p className="mt-1 text-sm text-app-muted">{ui.quickHelp}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium text-app-text">
            <span>{ui.fromDay}</span>
            <select
              value={quickFrom}
              onChange={(event) => setQuickFrom(Number(event.target.value))}
              className="w-full rounded-xl border border-app-soft bg-white px-3.5 py-3 outline-none"
            >
              {dayRows.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium text-app-text">
            <span>{ui.toDay}</span>
            <select
              value={quickTo}
              onChange={(event) => setQuickTo(Number(event.target.value))}
              className="w-full rounded-xl border border-app-soft bg-white px-3.5 py-3 outline-none"
            >
              {dayRows.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium text-app-text">
            <span>{t.salonHours.opens}</span>
            <AppointmentTimeSelect
              locale={locale}
              name="quick_opens"
              value={quickOpen}
              onChange={setQuickOpen}
              startHour={5}
              endHour={22}
              intervalMinutes={15}
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium text-app-text">
            <span>{t.salonHours.closes}</span>
            <AppointmentTimeSelect
              locale={locale}
              name="quick_closes"
              value={quickClose}
              onChange={setQuickClose}
              startHour={6}
              endHour={23}
              intervalMinutes={15}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={applyQuickHours}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app-accent/25 bg-white px-4 py-3 text-sm font-semibold text-app-text transition hover:bg-app-accent/5 sm:w-auto"
        >
          <CopyCheck className="h-4 w-4" /> {ui.apply}
        </button>
      </section>

      <div className="space-y-2">
        {dayRows.map((day) => {
          const item = items.find((row) => row.day_of_week === day.value)!;
          return (
            <article
              key={day.value}
              className={`rounded-2xl border bg-white p-4 transition ${
                item.is_closed ? "border-app-soft/70 opacity-75" : "border-app-soft"
              }`}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,240px)_minmax(180px,240px)_auto] lg:items-end">
                <div className="flex items-center justify-between gap-4 lg:block">
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
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition lg:hidden ${
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

                <button
                  type="button"
                  role="switch"
                  aria-checked={!item.is_closed}
                  onClick={() =>
                    updateItem(day.value, "is_closed", !item.is_closed)
                  }
                  className={`relative hidden h-7 w-12 shrink-0 items-center rounded-full transition lg:inline-flex ${
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
            </article>
          );
        })}
      </div>
    </div>
  );
}
