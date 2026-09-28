"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePlatformSalonEmailQuotaAction } from "@/features/platform-admin/email-actions";

export default function SalonEmailQuotaControl({
  organizationId,
  monthlyLimitOverride,
  defaultMonthlyLimit,
}: {
  organizationId: string;
  monthlyLimitOverride: number | null;
  defaultMonthlyLimit: number;
}) {
  const [value, setValue] = useState(
    monthlyLimitOverride === null ? "" : String(monthlyLimitOverride),
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function saveOverride() {
    const parsed = Number(value);
    if (!value.trim() || !Number.isInteger(parsed) || parsed <= 0) {
      toast.error("Upiši pozitivan cijeli broj za mjesečni limit.");
      return;
    }

    startTransition(async () => {
      const result = await updatePlatformSalonEmailQuotaAction({
        organizationId,
        monthlyLimitOverride: parsed,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setValue(String(result.monthlyLimitOverride ?? ""));
      toast.success("Email quota override je spremljen.");
      router.refresh();
    });
  }

  function resetOverride() {
    startTransition(async () => {
      const result = await updatePlatformSalonEmailQuotaAction({
        organizationId,
        monthlyLimitOverride: null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setValue("");
      toast.success("Salon ponovno koristi zadani mjesečni limit.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <label className="block text-sm font-semibold text-slate-700">
        <span>Mjesečni quota override</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`Default: ${defaultMonthlyLimit}`}
          disabled={pending}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:opacity-60"
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Prazan override znači da salon koristi platform default ({defaultMonthlyLimit}).
        Override ne zaobilazi globalni SalonFlow sigurnosni limit.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={saveOverride}
          disabled={pending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Spremi override
        </button>

        <button
          type="button"
          onClick={resetOverride}
          disabled={pending || monthlyLimitOverride === null}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" /> Vrati na default
        </button>
      </div>
    </div>
  );
}
