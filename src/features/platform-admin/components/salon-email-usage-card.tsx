import { CheckCircle2, Mail, TriangleAlert } from "lucide-react";
import { getManagedEmailDefaultMonthlyLimit } from "@/lib/email/managed-email";
import { getPlatformSalonEmailOverview } from "@/features/platform-admin/email-queries";
import SalonEmailQuotaControl from "@/features/platform-admin/components/salon-email-quota-control";

function formatMonth(periodStart: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${periodStart}T00:00:00Z`));
}

export default async function SalonEmailUsageCard({
  organizationId,
}: {
  organizationId: string;
}) {
  const overview = await getPlatformSalonEmailOverview(organizationId);
  const defaultMonthlyLimit = getManagedEmailDefaultMonthlyLimit();
  const effectiveLimit = overview.monthlyLimitOverride ?? defaultMonthlyLimit;
  const remaining = Math.max(effectiveLimit - overview.attemptedCount, 0);
  const usagePercent = Math.min(
    100,
    Math.round((overview.attemptedCount / effectiveLimit) * 100),
  );
  const limitReached = overview.attemptedCount >= effectiveLimit;
  const warning = !limitReached && usagePercent >= 80;
  const paused = !overview.managedEmailEnabled;

  const statusClasses = limitReached
    ? "border-red-200 bg-red-50 text-red-800"
    : warning || paused
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  const progressClasses = limitReached
    ? "bg-red-500"
    : warning
      ? "bg-amber-500"
      : "bg-slate-900";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
              Managed email
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Potrošnja i quota
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatMonth(overview.periodStart)} · {overview.provider === "salonflow" ? "SalonFlow Managed Email" : "Custom provider"}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusClasses}`}
        >
          {limitReached || warning || paused ? (
            <TriangleAlert className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {limitReached
            ? "Quota potrošena"
            : paused
              ? "Pauzirano"
              : warning
                ? "Blizu limita"
                : "Aktivno"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Poslano</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{overview.sentCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Neuspjelo</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{overview.failedCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Pokušaji</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{overview.attemptedCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Preostalo</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{remaining}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {overview.attemptedCount} / {effectiveLimit}
          </span>
          <span>{usagePercent}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${progressClasses}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            Efektivni limit
          </dt>
          <dd className="mt-2 font-semibold text-slate-900">
            {effectiveLimit} / mj.
            {overview.monthlyLimitOverride !== null ? " · override" : " · default"}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            Managed email
          </dt>
          <dd className="mt-2 font-semibold text-slate-900">
            {overview.managedEmailEnabled ? "Omogućen" : "Pauziran"}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            Sender
          </dt>
          <dd className="mt-2 break-words font-semibold text-slate-900">
            {overview.fromName || "SalonFlow"}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            Reply-To
          </dt>
          <dd className="mt-2 break-all font-semibold text-slate-900">
            {overview.replyToEmail || "-"}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <SalonEmailQuotaControl
          organizationId={organizationId}
          monthlyLimitOverride={overview.monthlyLimitOverride}
          defaultMonthlyLimit={defaultMonthlyLimit}
        />
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Usage brojevi su read-only. Quota override mijenja samo tenant limit i ne
        može zaobići globalni SalonFlow managed-email sigurnosni limit.
      </p>
    </section>
  );
}
