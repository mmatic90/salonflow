import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Mail,
  Send,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { getPlatformManagedEmailOverview } from "@/features/platform-admin/email-queries";
import {
  getManagedEmailDefaultMonthlyLimit,
  getManagedEmailGlobalMonthlyLimit,
} from "@/lib/email/managed-email";
import {
  lifecycleLabel,
  salonPlans,
  type SalonLifecycleStatus,
} from "@/lib/plans";

function formatMonth(periodStart: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${periodStart}T00:00:00Z`));
}

function lifecycleClasses(status: SalonLifecycleStatus) {
  switch (status) {
    case "trial":
      return "bg-blue-100 text-blue-800";
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "past_due":
      return "bg-amber-100 text-amber-800";
    case "suspended":
      return "bg-red-100 text-red-800";
  }
}

function usageState(percent: number, reached: boolean) {
  if (reached) {
    return {
      label: "Limit dosegnut",
      classes: "bg-red-100 text-red-800",
    };
  }
  if (percent >= 80) {
    return {
      label: "Blizu limita",
      classes: "bg-amber-100 text-amber-800",
    };
  }
  return {
    label: "U redu",
    classes: "bg-emerald-100 text-emerald-800",
  };
}

export default async function PlatformManagedEmailPage() {
  const overview = await getPlatformManagedEmailOverview();
  const defaultTenantLimit = getManagedEmailDefaultMonthlyLimit();
  const globalLimit = getManagedEmailGlobalMonthlyLimit();
  const globalRemaining = Math.max(globalLimit - overview.attemptedCount, 0);
  const globalPercent = Math.min(
    100,
    Math.round((overview.attemptedCount / globalLimit) * 100),
  );
  const globalReached = overview.attemptedCount >= globalLimit;
  const globalWarning = !globalReached && globalPercent >= 80;

  const salons = overview.salons
    .map((salon) => {
      const effectiveLimit = salon.monthlyLimitOverride ?? defaultTenantLimit;
      const remaining = Math.max(effectiveLimit - salon.attemptedCount, 0);
      const percent = Math.min(
        100,
        Math.round((salon.attemptedCount / effectiveLimit) * 100),
      );
      return {
        ...salon,
        effectiveLimit,
        remaining,
        percent,
        limitReached: salon.attemptedCount >= effectiveLimit,
      };
    })
    .sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      if (b.attemptedCount !== a.attemptedCount) {
        return b.attemptedCount - a.attemptedCount;
      }
      return a.organizationName.localeCompare(b.organizationName);
    });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
              SalonFlow Managed Email
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              Globalna email potrošnja
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Platformski pregled mjesečne potrošnje svih tenant računa. Usage je
              read-only; tenant quota override uređuje se na stranici pojedinog
              salona.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {formatMonth(overview.periodStart)}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <Send className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-3xl font-extrabold text-slate-950">
            {overview.sentCount}
          </p>
          <p className="mt-1 text-sm text-slate-500">Poslano</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <Mail className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-3xl font-extrabold text-slate-950">
            {overview.attemptedCount}
          </p>
          <p className="mt-1 text-sm text-slate-500">Pokušaji</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <XCircle className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-3xl font-extrabold text-slate-950">
            {overview.failedCount}
          </p>
          <p className="mt-1 text-sm text-slate-500">Neuspjelo</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-3xl font-extrabold text-slate-950">
            {globalRemaining}
          </p>
          <p className="mt-1 text-sm text-slate-500">Globalno preostalo</p>
        </div>
      </section>

      <section
        className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
          globalReached
            ? "border-red-200 bg-red-50"
            : globalWarning
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {globalReached || globalWarning ? (
                <AlertTriangle
                  className={`h-5 w-5 ${
                    globalReached ? "text-red-700" : "text-amber-700"
                  }`}
                />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              )}
              <h2 className="text-xl font-bold text-slate-950">
                Globalni sigurnosni limit
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {overview.attemptedCount} / {globalLimit} pokušaja ovog mjeseca
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              globalReached
                ? "bg-red-100 text-red-800"
                : globalWarning
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {globalReached
              ? "Globalni limit dosegnut"
              : globalWarning
                ? "Globalna potrošnja ≥ 80%"
                : "Globalna potrošnja u redu"}
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200">
          <div
            className={`h-full rounded-full transition-all ${
              globalReached
                ? "bg-red-500"
                : globalWarning
                  ? "bg-amber-500"
                  : "bg-slate-900"
            }`}
            style={{ width: `${globalPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{globalPercent}% iskorišteno</span>
          <span>{globalRemaining} preostalo</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-bold text-slate-950">Potrošnja po salonu</h2>
          <p className="mt-1 text-sm text-slate-500">
            Saloni su sortirani od najvećeg postotka iskorištene tenant kvote.
            Default tenant limit je {defaultTenantLimit} / mj.
          </p>
        </div>

        {salons.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Nema registriranih salona.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Salon</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Poslano</th>
                  <th className="px-4 py-3 text-right">Failed</th>
                  <th className="px-4 py-3 text-right">Pokušaji</th>
                  <th className="px-4 py-3 text-right">Limit</th>
                  <th className="px-4 py-3 text-right">Usage</th>
                  <th className="px-4 py-3 text-right">Preostalo</th>
                  <th className="px-5 py-3 text-right">Detalji</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salons.map((salon) => {
                  const state = usageState(salon.percent, salon.limitReached);
                  return (
                    <tr key={salon.organizationId} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="min-w-48">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-950">
                              {salon.organizationName}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                              {salonPlans[salon.planCode].name}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${lifecycleClasses(
                                salon.lifecycleStatus,
                              )}`}
                            >
                              {lifecycleLabel(salon.lifecycleStatus)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            /{salon.organizationSlug}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {salon.provider === "salonflow"
                          ? "SalonFlow"
                          : "Custom"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-28 flex-col items-start gap-1.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              salon.managedEmailEnabled
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {salon.managedEmailEnabled ? "Aktivno" : "Pauzirano"}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state.classes}`}>
                            {state.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-800">
                        {salon.sentCount}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-800">
                        {salon.failedCount}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-800">
                        {salon.attemptedCount}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-700">
                        {salon.effectiveLimit}
                        {salon.monthlyLimitOverride !== null ? (
                          <span className="ml-1 text-xs text-slate-400">*</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${state.classes}`}
                        >
                          {salon.percent >= 80 ? (
                            <TriangleAlert className="h-3 w-3" />
                          ) : null}
                          {salon.percent}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-800">
                        {salon.remaining}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/platform/salons/${salon.organizationId}/email`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
                        >
                          Otvori <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:px-6">
          * označava salon s ručno postavljenim quota overrideom. Globalni usage i
          tenant usage brojevi ne mogu se uređivati iz Platform Admina.
        </div>
      </section>
    </div>
  );
}
