import { getReportsDashboardData } from "@/features/reports/queries";
import { requireAdminForReports } from "@/lib/page-guards";
import EmptyStateCard from "@/components/empty-state-card";
import PageShell from "@/components/page-shell";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import {
  Activity,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Crown,
  Sparkles,
  TrendingUp,
  UserX,
  UsersRound,
} from "lucide-react";

function formatReportDate(value: string, locale: AppLocale) {
  const date = new Date(value + "T00:00:00");
  return new Intl.DateTimeFormat(
    locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR",
    { day: "2-digit", month: "2-digit", year: "numeric" },
  ).format(date);
}

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

function RankingList({
  items,
  emptyTitle,
  emptyDescription,
  appointmentsSuffix,
}: {
  items: { name: string; count: number }[];
  emptyTitle: string;
  emptyDescription: string;
  appointmentsSuffix: string;
}) {
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
                <div className="mt-1 text-xs text-app-muted">{item.count} {appointmentsSuffix}</div>
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
  const permissions = await requireAdminForReports();
  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.reports;
  const data = await getReportsDashboardData(permissions.organizationId);
  const hasAnyReportData = data.summary.today > 0 || data.summary.week > 0 || data.summary.month > 0;
  const maxLast14 = Math.max(...data.last14Days.map((item) => item.count), 1);

  return (
    <PageShell maxWidth="max-w-7xl">
      <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="bg-gradient-to-br from-white via-white to-app-bg p-5 sm:p-6 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-app-soft bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-app-accent shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> {t.badge}
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-app-text md:text-4xl">{t.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted sm:text-base">{t.intro}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-app-bg px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{t.today}</p><p className="mt-1 text-xl font-extrabold text-app-text">{data.summary.today}</p></div>
              <div className="rounded-2xl bg-app-bg px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{t.week}</p><p className="mt-1 text-xl font-extrabold text-app-text">{data.summary.week}</p></div>
              <div className="rounded-2xl bg-app-bg px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{t.month}</p><p className="mt-1 text-xl font-extrabold text-app-text">{data.summary.month}</p></div>
              <div className="rounded-2xl bg-app-bg px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{t.completed}</p><p className="mt-1 text-xl font-extrabold text-app-text">{data.summary.completionRate}%</p></div>
            </div>
          </div>
        </div>
      </section>

      {!hasAnyReportData ? <EmptyStateCard title={t.noDataTitle} description={t.noDataDescription} /> : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t.appointmentsToday} value={data.summary.today} helper={t.todaysSchedule} />
        <StatCard label={t.appointmentsWeek} value={data.summary.week} helper={t.activityThisWeek} />
        <StatCard label={t.appointmentsMonth} value={data.summary.month} helper={t.monthlyVolume} />
        <StatCard label={t.completionRate} value={`${data.summary.completionRate}%`} helper={t.completedVsAll} />
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t.completedPlural} value={data.summary.completedMonth} helper={t.thisMonth} />
        <StatCard label={t.scheduled} value={data.summary.scheduledMonth} helper={t.thisMonth} />
        <StatCard label={t.cancelled} value={data.summary.cancelledMonth} helper={t.thisMonth} />
        <StatCard label={t.noShow} value={data.summary.noShowMonth} helper={data.summary.noShowRate + "% " + t.allAppointments} />
      </section>

      <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-app-muted">{t.onlineBookings}</p>
            <h2 className="mt-1 text-xl font-bold text-app-text">{t.bookingFunnel}</h2>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
            <BellRing className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-app-bg p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{t.total}</p>
            <p className="mt-2 text-2xl font-extrabold text-app-text">{data.onlineCounts.total}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">{t.pending}</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-900">{data.onlineCounts.pending}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">{t.accepted}</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-900">{data.onlineCounts.accepted}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-rose-700">{t.rejected}</p>
            <p className="mt-2 text-2xl font-extrabold text-rose-900">{data.onlineCounts.rejected}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
          <div className="space-y-4">
            <ProgressRow label={t.accepted} value={data.onlineCounts.accepted} total={data.onlineCounts.total} />
            <ProgressRow label={t.pending} value={data.onlineCounts.pending} total={data.onlineCounts.total} />
            <ProgressRow label={t.rejected} value={data.onlineCounts.rejected} total={data.onlineCounts.total} />
          </div>
          <div className="rounded-2xl bg-app-accent/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{t.conversion}</p>
            <p className="mt-2 text-3xl font-extrabold text-app-text">{data.summary.onlineConversionRate}%</p>
            <p className="mt-2 text-xs leading-5 text-app-muted">{t.conversionHelp}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-app-muted">{t.monthlyQuality}</p><h2 className="mt-1 text-xl font-bold text-app-text">{t.appointmentStatuses}</h2></div><Activity className="h-5 w-5 text-app-accent" /></div>
          <div className="mt-6 space-y-5">
            <ProgressRow label={t.completedPlural} value={data.statusCounts.completed} total={data.summary.month} />
            <ProgressRow label={t.scheduled} value={data.statusCounts.scheduled} total={data.summary.month} />
            <ProgressRow label={t.cancelled} value={data.statusCounts.cancelled} total={data.summary.month} />
            <ProgressRow label={t.noShow} value={data.statusCounts.no_show} total={data.summary.month} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">{t.completion}</p><p className="mt-1 text-2xl font-extrabold text-emerald-900">{data.summary.completionRate}%</p></div>
            <div className="rounded-2xl bg-amber-50 p-4"><UserX className="h-5 w-5 text-amber-600" /><p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">No-show</p><p className="mt-1 text-2xl font-extrabold text-amber-900">{data.summary.noShowRate}%</p></div>
          </div>
        </div>

        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-app-muted">{t.activityTrend}</p><h2 className="mt-1 text-xl font-bold text-app-text">{t.last14Days}</h2></div><TrendingUp className="h-5 w-5 text-app-accent" /></div>
          <div className="mt-6 grid grid-cols-7 gap-2">
            {data.last14Days.map((day) => {
              const height = Math.max(12, Math.round((day.count / maxLast14) * 100));
              return (
                <div key={day.date} className="flex min-w-0 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end rounded-xl bg-app-bg p-1"><div className="w-full rounded-lg bg-app-accent transition" style={{ height: `${height}%` }} /></div>
                  <span className="text-[10px] font-semibold text-app-muted">{formatReportDate(day.date, permissions.organizationLocale).slice(0, 5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent"><Crown className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-app-muted">{t.teamPerformance}</p><h2 className="text-xl font-bold text-app-text">{t.topEmployees}</h2></div></div>
          <RankingList appointmentsSuffix={t.appointmentsSuffix} items={data.topEmployees} emptyTitle={t.noEmployeeData} emptyDescription={t.notEnoughAppointments} />
        </div>
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent"><BarChart3 className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-app-muted">{t.demand}</p><h2 className="text-xl font-bold text-app-text">{t.topServices}</h2></div></div>
          <RankingList appointmentsSuffix={t.appointmentsSuffix} items={data.topServices} emptyTitle={t.noServiceData} emptyDescription={t.notEnoughAppointments} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-app-muted">{t.dailyOverview}</p><h2 className="mt-1 text-xl font-bold text-app-text">{t.last14Days}</h2></div><CalendarDays className="h-5 w-5 text-app-accent" /></div>
          <div className="mt-5 space-y-2">{data.last14Days.map((day) => (<div key={day.date} className="flex items-center justify-between rounded-2xl border border-app-soft px-4 py-3"><div><p className="font-semibold text-app-text">{formatReportDate(day.date, permissions.organizationLocale)}</p><p className="mt-1 text-xs text-app-muted">{t.completedPlural} {day.completed} · {t.noShow} {day.no_show}</p></div><span className="rounded-full bg-app-bg px-3 py-1 text-sm font-bold text-app-text">{day.count}</span></div>))}</div>
        </div>
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-app-muted">{t.capacity}</p><h2 className="mt-1 text-xl font-bold text-app-text">{t.busiestDays}</h2></div><UsersRound className="h-5 w-5 text-app-accent" /></div>
          <div className="mt-5 space-y-3">{data.busiestDays.map((day, index) => (<div key={`${day.date}-${index}`} className="flex items-center justify-between rounded-2xl border border-app-soft bg-app-bg/50 px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white font-extrabold text-app-accent shadow-sm">{index + 1}</span><div><p className="font-semibold text-app-text">{formatReportDate(day.date, permissions.organizationLocale)}</p><p className="mt-1 text-xs text-app-muted">{t.completedPlural} {day.completed} · {t.noShow} {day.no_show}</p></div></div><span className="text-lg font-extrabold text-app-text">{day.count}</span></div>))}</div>
        </div>
      </section>
    </PageShell>
  );
}
