"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  label?: string;
  value: string;
  basePath: string;
  extraParams?: Record<string, string>;
};

export default function DateQueryPicker({
  locale = "hr",
  label,
  value,
  basePath,
  extraParams = {},
}: Props) {
  const dictionary = getDictionary(locale);
  const resolvedLabel = label ?? dictionary.appointments.selectDate;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);
  const [isPending, startTransition] = useTransition();

  function handleChange(nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextDate);

    Object.entries(extraParams).forEach(([key, val]) => {
      params.set(key, val);
    });

    startTransition(() => {
      setOptimisticValue(nextDate);
      router.replace(`${basePath}?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-1">
      <label htmlFor="date" className="block text-sm font-medium text-app-text">
        {resolvedLabel}
      </label>

      <div className="flex items-center gap-3">
        <input
          id="date"
          name="date"
          type="date"
          value={optimisticValue}
          onChange={(e) => handleChange(e.target.value)}
          className="rounded-xl border border-app-soft bg-white px-4 py-2 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
        />

        {isPending ? (
          <span className="text-sm text-app-muted">{dictionary.appointments.loading}</span>
        ) : null}
      </div>
    </div>
  );
}
