"use client";

import { useTransition } from "react";
import { CalendarDays, Clock3, Coffee, Trash2 } from "lucide-react";
import { deleteScheduleOverrideAction } from "@/features/schedule/actions";
import type { EmployeeScheduleOverrideItem } from "@/features/schedule/types";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import { useRouter } from "next/navigation";

type Props = {
  locale?: AppLocale;
  employeeId: string;
  overrides: EmployeeScheduleOverrideItem[];
};

function overrideLabel(
  value: EmployeeScheduleOverrideItem["override_type"],
  locale: AppLocale,
) {
  const t = getDictionary(locale).schedule;
  if (value === "custom_hours") return t.customHours;
  if (value === "day_off") return t.dayOff;
  if (value === "vacation") return t.vacation;
  if (value === "sick_leave") return t.sickLeave;
  return value;
}

function formatDate(value: string, locale: AppLocale) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(
    locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function copy(locale: AppLocale) {
  if (locale === "en") return { break: "Break" };
  if (locale === "it") return { break: "Pausa" };
  return { break: "Pauza" };
}

export default function OverrideList({ locale = "hr", employeeId, overrides }: Props) {
  const t = getDictionary(locale).schedule;
  const ui = copy(locale);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (overrides.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-app-soft bg-app-card-alt/40 p-6 text-center text-sm text-app-muted">
        {t.noOverrides}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {overrides.map((override) => (
        <article
          key={override.id}
          className="rounded-2xl border border-app-soft bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-app-text">
                <CalendarDays className="h-4 w-4 text-app-muted" />
                {formatDate(override.override_date, locale)}
              </div>
              <span className="mt-2 inline-flex rounded-full border border-app-soft bg-app-card-alt px-2.5 py-1 text-xs font-semibold text-app-muted">
                {overrideLabel(override.override_type, locale)}
              </span>
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await deleteScheduleOverrideAction(employeeId, override.id);
                    router.refresh();
                  } catch (error) {
                    console.error(error);
                    alert(t.deleteError);
                  }
                })
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              aria-label={t.delete}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {override.start_time && override.end_time ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text">
                <Clock3 className="h-4 w-4 text-app-muted" />
                {override.start_time.slice(0, 5)} – {override.end_time.slice(0, 5)}
              </span>
              {override.break_start_time && override.break_end_time ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-app-soft bg-app-card-alt px-3 py-2 text-sm font-medium text-app-text">
                  <Coffee className="h-4 w-4 text-app-muted" />
                  {ui.break}: {override.break_start_time.slice(0, 5)} – {override.break_end_time.slice(0, 5)}
                </span>
              ) : null}
            </div>
          ) : null}

          {override.note ? (
            <p className="mt-3 text-sm leading-6 text-app-muted">{override.note}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
