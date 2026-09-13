"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePlatformSalonLifecycleAction } from "@/features/platform-admin/actions";
import {
  salonLifecycleStatuses,
  salonPlanCodes,
  salonPlans,
  lifecycleLabel,
  type SalonLifecycleStatus,
  type SalonPlanCode,
} from "@/lib/plans";

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default function SalonPlanLifecycleControl({
  organizationId,
  organizationName,
  planCode,
  lifecycleStatus,
  trialEndsAt,
}: {
  organizationId: string;
  organizationName: string;
  planCode: SalonPlanCode;
  lifecycleStatus: SalonLifecycleStatus;
  trialEndsAt: string | null;
}) {
  const [plan, setPlan] = useState<SalonPlanCode>(planCode);
  const [status, setStatus] = useState<SalonLifecycleStatus>(lifecycleStatus);
  const [trialEndsOn, setTrialEndsOn] = useState(dateInputValue(trialEndsAt));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    if (status === "trial" && !trialEndsOn) {
      toast.error("Za Trial status odredi datum završetka triala.");
      return;
    }

    if (status === "suspended") {
      const confirmed = window.confirm(
        `Suspendirati salon “${organizationName}”? Članovi neće moći pristupiti salon dashboardu, ali podaci se neće obrisati.`,
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      const result = await updatePlatformSalonLifecycleAction({
        organizationId,
        planCode: plan,
        lifecycleStatus: status,
        trialEndsOn,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Plan i lifecycle status su spremljeni.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
          Subscription lifecycle
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">
          Plan i status salona
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Billing još nije automatski spojen. Past due trenutno označava problem s
          naplatom, ali ne blokira salon. Samo Suspended blokira pristup.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-700">
          <span>Plan</span>
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value as SalonPlanCode)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            {salonPlanCodes.map((code) => (
              <option key={code} value={code}>
                {salonPlans[code].name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          <span>Lifecycle status</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as SalonLifecycleStatus)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            {salonLifecycleStatuses.map((value) => (
              <option key={value} value={value}>
                {lifecycleLabel(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
        <span>Završetak triala</span>
        <input
          type="date"
          value={trialEndsOn}
          onChange={(event) => setTrialEndsOn(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
        />
        <span className="block text-xs font-normal leading-5 text-slate-500">
          Obavezan je samo dok je salon u Trial statusu. Datum se čuva i nakon
          aktivacije kao dio lifecycle povijesti.
        </span>
      </label>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">{salonPlans[plan].name}</p>
        <p className="mt-1 leading-5">{salonPlans[plan].description}</p>
        <p className="mt-2 text-xs text-slate-500">
          Hard limiti za djelatnike i usluge još nisu aktivirani.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {pending ? "Spremanje..." : "Spremi plan i status"}
      </button>
    </section>
  );
}
