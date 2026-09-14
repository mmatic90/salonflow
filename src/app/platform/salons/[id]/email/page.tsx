import Link from "next/link";
import { ArrowLeft, Mail, Star } from "lucide-react";
import SalonEmailUsageCard from "@/features/platform-admin/components/salon-email-usage-card";
import { getPlatformSalonById } from "@/features/platform-admin/queries";
import { getPlatformReviewAutomationOverview } from "@/features/platform-admin/review-queries";
import { notFound } from "next/navigation";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("hr-HR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PlatformSalonEmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const salon = await getPlatformSalonById(id);
  if (!salon) notFound();
  const reviewAutomation = await getPlatformReviewAutomationOverview(salon.id);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        href={`/platform/salons/${salon.id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Natrag na {salon.name}
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
              Platform Admin
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
              Email potrošnja · {salon.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Pregled SalonFlow Managed Email potrošnje i tenant quota kontrole.
              Usage brojevi su read-only; ovdje se može mijenjati samo mjesečni
              quota override.
            </p>
          </div>
        </div>
      </section>

      <SalonEmailUsageCard organizationId={salon.id} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                Pro automatizacija
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Google review requests
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Platform Admin vidi samo konfiguracijski status, bez klijenata,
                termina ili sadržaja review poruka.
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              reviewAutomation.configured
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {reviewAutomation.configured ? "Konfigurirano" : "Nije konfigurirano"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              Status
            </p>
            <p className="mt-2 font-semibold text-slate-900">
              {reviewAutomation.enabled ? "Uključeno" : "Isključeno"}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              Odgoda
            </p>
            <p className="mt-2 font-semibold text-slate-900">
              {reviewAutomation.delayHours} h
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              Uključeno od
            </p>
            <p className="mt-2 font-semibold text-slate-900">
              {formatDate(reviewAutomation.enabledAt)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
