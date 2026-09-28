import Link from "next/link";
import { ArrowLeft, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import CreateSalesTrialForm from "@/features/platform-admin/components/create-sales-trial-form";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export default async function NewSalesTrialPage() {
  await requirePlatformAdmin();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/platform"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" /> Natrag na Platform Admin
      </Link>

      <div className="mb-7 grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Sales Trial
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Kreiraj privatni SalonFlow za potencijalnog klijenta
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Svaki salon dobiva vlastiti tenant, vlasnički račun i 14 dana Pro funkcionalnosti. Po želji ga možeš odmah napuniti sigurnim demo podacima kako bi korisnik imao što istraživati od prvog prijavljivanja.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <ShieldCheck className="h-5 w-5 text-emerald-600" /> Vlastiti tenant i podaci
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <Clock3 className="h-5 w-5 text-blue-600" /> 14 dana Pro triala
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <Sparkles className="h-5 w-5 text-violet-600" /> Demo podaci bez stvarnih emailova
          </div>
        </div>
      </div>

      <CreateSalesTrialForm />
    </div>
  );
}
