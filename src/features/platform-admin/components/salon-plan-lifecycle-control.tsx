"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePlatformSalonLifecycleAction } from "@/features/platform-admin/actions";
import {
  getEffectiveEntitlementPlan,
  getPlanCapabilities,
} from "@/lib/entitlements";
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
  const entitlementPlan = getEffectiveEntitlementPlan(plan, status);
  const capabilities = getPlanCapabilities(entitlementPlan);

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

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-slate-900">
              Capability preview · {salonPlans[entitlementPlan].name}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {status === "trial"
                ? "Trial privremeno koristi puni Pro entitlement bez obzira na odabrani plaćeni plan."
                : "Pregled auditirane matrice funkcija za ovaj plan."}
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            Enforcement još nije uključen
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            Dostupno = spremno za tenant korištenje
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
            Djelomično = treba dovršiti prije enforcementa
          </span>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
            Planirano = roadmap
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {capabilities.map((capability) => {
            const isAvailable = capability.availability === "available";
            const isPartial = capability.availability === "partial";

            return (
              <div
                key={capability.code}
                className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
              >
                {isAvailable ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                ) : isPartial ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                ) : (
                  <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {capability.name}
                    </p>
                    {!isAvailable ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isPartial
                            ? "bg-amber-100 text-amber-700"
                            : "bg-violet-100 text-violet-700"
                        }`}
                      >
                        {isPartial ? "Djelomično" : "Planirano"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {capability.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
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
