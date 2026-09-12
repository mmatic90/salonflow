"use client";

import { useTransition } from "react";
import { deleteScheduleOverrideAction } from "@/features/schedule/actions";
import type { EmployeeScheduleOverrideItem } from "@/features/schedule/types";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import { useRouter } from "next/navigation";

type Props = {
  locale?: AppLocale;
  employeeId: string;
  overrides: EmployeeScheduleOverrideItem[];
};

function overrideLabel(value: EmployeeScheduleOverrideItem["override_type"], locale: AppLocale) {
  const t = getDictionary(locale).schedule;
  if (value === "custom_hours") return t.customHours;
  if (value === "day_off") return t.dayOff;
  if (value === "vacation") return t.vacation;
  if (value === "sick_leave") return t.sickLeave;
  return value;
}

function formatDate(value: string, locale: AppLocale) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function OverrideList({ locale = "hr", employeeId, overrides }: Props) {
  const t = getDictionary(locale).schedule;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (overrides.length === 0) {
    return <p className="text-neutral-600">{t.noOverrides}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="bg-neutral-50">
          <tr className="text-left text-sm text-neutral-600">
            <th className="px-4 py-3 font-semibold">{t.date}</th>
            <th className="px-4 py-3 font-semibold">{t.type}</th>
            <th className="px-4 py-3 font-semibold">{t.time}</th>
            <th className="px-4 py-3 font-semibold">{t.note}</th>
            <th className="px-4 py-3 font-semibold">{t.actions}</th>
          </tr>
        </thead>

        <tbody>
          {overrides.map((override) => (
            <tr
              key={override.id}
              className="border-t border-neutral-200 text-sm"
            >
              <td className="px-4 py-4">
                {formatDate(override.override_date, locale)}
              </td>
              <td className="px-4 py-4">
                {overrideLabel(override.override_type, locale)}
              </td>
              <td className="px-4 py-4">
                {override.start_time && override.end_time
                  ? `${override.start_time.slice(0, 5)} - ${override.end_time.slice(0, 5)}`
                  : "-"}
              </td>
              <td className="px-4 py-4">{override.note || "-"}</td>
              <td className="px-4 py-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deleteScheduleOverrideAction(
                          employeeId,
                          override.id,
                        );
                        router.refresh();
                      } catch (error) {
                        console.error(error);
                        alert(t.deleteError);
                      }
                    })
                  }
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
                >
                  {t.delete}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
