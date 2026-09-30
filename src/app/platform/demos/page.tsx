import Link from "next/link";
import { ArrowLeft, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import ShowcaseDemoManager from "@/features/platform-admin/components/showcase-demo-manager";
import { getShowcaseDemoStatuses } from "@/features/platform-admin/showcase-demo-queries";

export default async function ShowcaseDemosPage() {
  const demos = await getShowcaseDemoStatuses();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        href="/platform"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" /> Natrag na Platform Admin
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-700">
              Showcase Demo
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
              Stalni demo saloni za prodajne prezentacije
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Tri odvojena Pro salona za hrvatski, talijanski i engleski demo. Nisu Sales Trial računi i nemaju datum isteka. Podaci se mogu osvježiti prije svakog demo poziva tako da povijest i budući termini uvijek budu vezani uz aktualni datum.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> Aktivni Pro tenant računi
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <RefreshCw className="h-5 w-5 text-blue-600" /> Reset i novi relativni termini
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <Sparkles className="h-5 w-5 text-fuchsia-600" /> Lokalizirani HR / IT / EN podaci
            </div>
          </div>
        </div>
      </section>

      <ShowcaseDemoManager demos={demos} />
    </div>
  );
}
