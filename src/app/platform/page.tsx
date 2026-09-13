import Link from "next/link";
import { ArrowRight, Building2, Mail, MessageSquareText, Phone, ShieldCheck, UsersRound } from "lucide-react";
import { getPlatformOverview } from "@/features/platform-admin/queries";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </span>
      </div>
    </div>
  );
}

export default async function PlatformAdminPage() {
  const { salons, stats } = await getPlatformOverview();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">SalonFlow</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Platform Admin</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Pregled tenant računa i centralnog feedbacka. Ovdje se namjerno ne prikazuju klijenti, termini, tretmanske bilješke ni poslovni podaci salona.
            </p>
          </div>
          <Link
            href="/platform/feedback"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <MessageSquareText className="h-4 w-4" /> Otvori feedback <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ukupno salona" value={stats.totalSalons} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Aktivni saloni" value={stats.activeSalons} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Otvoreni feedback" value={stats.openFeedback} icon={<MessageSquareText className="h-5 w-5" />} />
        <StatCard label="Ukupno feedbacka" value={stats.totalFeedback} icon={<MessageSquareText className="h-5 w-5" />} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-bold text-slate-950">Saloni</h2>
          <p className="text-sm text-slate-500">Samo podaci potrebni za upravljanje tenant računom i kontakt s vlasnikom.</p>
        </div>

        {salons.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Nema registriranih salona.</div>
        ) : (
          <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
            {salons.map((salon) => (
              <article key={salon.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-bold text-slate-950">{salon.name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${salon.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                        {salon.isActive ? "Aktivan" : "Neaktivan"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">/{salon.slug} · {salon.locale.toUpperCase()} · {salon.currency}</p>
                  </div>
                  {salon.openFeedback > 0 ? (
                    <Link href="/platform/feedback" className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      {salon.openFeedback} feedback
                    </Link>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Vlasnik</p>
                    <p className="mt-1 font-semibold text-slate-800">{salon.ownerName || "Nije navedeno"}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{salon.ownerEmail || "Email nije dostupan"}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Salon kontakt</p>
                    <p className="mt-1 flex items-center gap-2 text-slate-700"><Mail className="h-3.5 w-3.5" /> {salon.email || "-"}</p>
                    <p className="mt-1 flex items-center gap-2 text-slate-700"><Phone className="h-3.5 w-3.5" /> {salon.phone || "-"}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" /> {salon.activeMembers} aktivnih članova</span>
                  <span>{[salon.city, salon.countryCode].filter(Boolean).join(", ")}</span>
                  <span>Kreiran {formatDate(salon.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
