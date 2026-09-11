import { getReportsDashboardData } from "@/features/reports/queries";
import { requireAdminForReports } from "@/lib/page-guards";
import { formatDateHR } from "@/lib/datetime";
import EmptyStateCard from "@/components/empty-state-card";
import PageShell from "@/components/page-shell";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Crown,
  Sparkles,
  TrendingUp,
  UserX,
  UsersRound,
} from "lucide-react";

function StatCard({ label, value, helper }: { label: string; value: number | string; helper?: string }) {
  return (
    <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{label}</div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-app-text">{value}</div>
      {helper ? <div className="mt-2 text-xs text-app-muted">{helper}</div> : null}
    </div>
  );
}

function ProgressRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-app-text">{label}</span>
        <span className="text-app-muted">{value} / {total} ({percent}%)</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-app-card-alt">
        <div className="h-full rounded-full bg-app-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function RankingList({ items, emptyTitle, emptyDescription }: { items: { name: string; count: number }[]; emptyTitle: string; emptyDescription: string }) {
  if (items.length === 0) return <EmptyStateCard title={emptyTitle} description={emptyDescription} />;
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="mt-5 space-y-3">
      {items.map((item, index) => {
        const percent = Math.round((item.count / max) * 100);
        return (
          <div key={`${item.name}-${index}`} className="rounded-2xl border border-app-soft bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-app-text">{index + 1}. {item.name}</div>
                <div className="mt-1 text-xs text-app-muted">{item.count} termina</div>
              </div>
              <div className="text-lg font-extrabold text-app-text">{item.count}</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-app-card-alt">
              <div className="h-full rounded-full bg-app-accent" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function ReportsPage() {
  await requireAdminForReports();
  const data = await getReportsDashboardData();
  const hasAnyReportData = data.summary.today > 0 || data.summary.week > 0 || data.summary.month > 0;
  const maxLast14 = Math.max(...data.last14Days.map((item) => item.count), 1);

  return (
    <PageShell maxWidth="max-w-7xl">
      <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="bg-gradient-to-br from-white via-white to-app-bg p-5 sm:p-6 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-app-soft bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-app-accent shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> Analytics
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-app-text md:text-4xl">Reports</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted sm:text-base">Pregled performansi salona, statusa termina, zaposlenika i najtraženijih usluga.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-app-bg px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Danas</p><p className="mt-1 text-xl font-extrabold text-app-text">{data.summary.today}</p></div>
              <div className="rounded-2xl bg-app-bg px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Tjedan</p><p className="mt-1 text-xl font-extrabold text-app-text">{data.summary.week}</p></div>
              <div className="rounded-2xl bg-app-bg px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Mjesec</p><p className="mt-1 text-xl font-extrabold text-app-text">{data.summary.month}</p></div>
              <div className="rounded-2xl bg-app-bg px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Odrađeno</p><p className="mt-1 text-xl font-extrabold text-app-text">{data.summary.completionRate}%</p></div>
            </div>
          </div>
        </div>
      </section>

      {!hasAnyReportData ? <EmptyStateCard title="Još nema podataka za izvještaje" description="Kad počneš unositi i obrađivati termine, ovdje će se prikazivati statistika poslovanja." /> : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Termini danas" value={data.summary.today} helper="Današnji raspored" />
        <StatCard label="Termini ovaj tjedan" value={data.summary.week} helper="Aktivnost ovog tjedna" />
        <StatCard label="Termini ovaj mjesec" value={data.summary.month} helper="Ukupan mjesečni volumen" />
        <StatCard label="Completion rate" value={`${data.summary.completionRate}%`} helper="Odrađeni / svi termini" />
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Odrađeni" value={data.summary.completedMonth} helper="Ovaj mjesec" />
        <StatCard label="Zakazani" value={data.summary.scheduledMonth} helper="Ovaj mjesec" />
        <StatCard label="Otkazani" value={data.summary.cancelledMonth} helper="Ovaj mjesec" />
        <StatCard label="No-show" value={data.summary.noShowMonth} helper={`${data.summary.noShowRate}% svih termina`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-app-muted">Mjesečna kvaliteta</p><h2 className="mt-1 text-xl font-bold text-app-text">Statusi termina</h2></div><Activity className="h-5 w-5 text-app-accent" /></div>
          <div className="mt-6 space-y-5">
            <ProgressRow label="Odrađeni" value={data.statusCounts.completed} total={data.summary.month} />
            <ProgressRow label="Zakazani" value={data.statusCounts.scheduled} total={data.summary.month} />
            <ProgressRow label="Otkazani" value={data.statusCounts.cancelled} total={data.summary.month} />
            <ProgressRow label="No-show" value={data.statusCounts.no_show} total={data.summary.month} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">Completion</p><p className="mt-1 text-2xl font-extrabold text-emerald-900">{data.summary.completionRate}%</p></div>
            <div className="rounded-2xl bg-amber-50 p-4"><UserX className="h-5 w-5 text-amber-600" /><p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">No-show</p><p className="mt-1 text-2xl font-extrabold text-amber-900">{data.summary.noShowRate}%</p></div>
          </div>
        </div>

        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-app-muted">Trend aktivnosti</p><h2 className="mt-1 text-xl font-bold text-app-text">Zadnjih 14 dana</h2></div><TrendingUp className="h-5 w-5 text-app-accent" /></div>
          <div className="mt-6 grid grid-cols-7 gap-2">
            {data.last14Days.map((day) => {
              const height = Math.max(12, Math.round((day.count / maxLast14) * 100));
              return (
                <div key={day.date} className="flex min-w-0 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end rounded-xl bg-app-bg p-1"><div className="w-full rounded-lg bg-app-accent transition" style={{ height: `${height}%` }} /></div>
                  <span className="text-[10px] font-semibold text-app-muted">{formatDateHR(day.date).slice(0, 5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent"><Crown className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-app-muted">Performanse tima</p><h2 className="text-xl font-bold text-app-text">Top zaposlenici</h2></div></div>
          <RankingList items={data.topEmployees} emptyTitle="Nema podataka o zaposlenicima" emptyDescription="Još nema dovoljno termina u odabranom rasponu." />
        </div>
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent"><BarChart3 className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-app-muted">Potražnja</p><h2 className="text-xl font-bold text-app-text">Top usluge</h2></div></div>
          <RankingList items={data.topServices} emptyTitle="Nema podataka o uslugama" emptyDescription="Još nema dovoljno termina u odabranom rasponu." />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-app-muted">Dnevni pregled</p><h2 className="mt-1 text-xl font-bold text-app-text">Zadnjih 14 dana</h2></div><CalendarDays className="h-5 w-5 text-app-accent" /></div>
          <div className="mt-5 space-y-2">{data.last14Days.map((day) => (<div key={day.date} className="flex items-center justify-between rounded-2xl border border-app-soft px-4 py-3"><div><p className="font-semibold text-app-text">{formatDateHR(day.date)}</p><p className="mt-1 text-xs text-app-muted">Odrađeni {day.completed} · No-show {day.no_show}</p></div><span className="rounded-full bg-app-bg px-3 py-1 text-sm font-bold text-app-text">{day.count}</span></div>))}</div>
        </div>
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-app-muted">Kapacitet</p><h2 className="mt-1 text-xl font-bold text-app-text">Najaktivniji dani</h2></div><UsersRound className="h-5 w-5 text-app-accent" /></div>
          <div className="mt-5 space-y-3">{data.busiestDays.map((day, index) => (<div key={`${day.date}-${index}`} className="flex items-center justify-between rounded-2xl border border-app-soft bg-app-bg/50 px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white font-extrabold text-app-accent shadow-sm">{index + 1}</span><div><p className="font-semibold text-app-text">{formatDateHR(day.date)}</p><p className="mt-1 text-xs text-app-muted">Odrađeni {day.completed} · No-show {day.no_show}</p></div></div><span className="text-lg font-extrabold text-app-text">{day.count}</span></div>))}</div>
        </div>
      </section>
    </PageShell>
  );
}
