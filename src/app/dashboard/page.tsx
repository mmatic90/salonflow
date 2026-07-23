import Link from "next/link";
import { requireDashboardUser } from "@/lib/page-guards";
import {
  canAccessReports,
  canAccessSettings,
  canAccessScheduleManagement,
} from "@/lib/permissions";
import OverdueAppointmentsPanel from "@/components/overdue-appointments-panel";
import { getOverdueScheduledAppointments } from "@/features/appointments/overdue-queries";
import DashboardLinkCard from "@/components/dashboard-link-card";
import {
  Calendar,
  Users,
  Settings,
  Clock,
  BarChart3,
  UserCog,
  Activity,
  ArrowRight,
} from "lucide-react";
import DashboardOverviewWidget from "@/components/dashboard-overview-widget";
import { getDashboardOverviewStats } from "@/features/dashboard/overview-queries";
import { getAuditLogs } from "@/features/audit/queries";

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    appointment_created: "dodan termin",
    appointment_updated: "uređen termin",
    appointment_cancelled: "otkazan termin",
    appointment_status_changed: "promijenjen status termina",
    appointment_deleted: "obrisan termin",
    client_created: "dodan klijent",
    client_updated: "uređen klijent",
    client_deleted: "obrisan klijent",
    employee_created: "dodan zaposlenik",
    employee_updated: "uređen zaposlenik",
    service_created: "dodana usluga",
    services_bulk_updated: "uređene usluge",
    rooms_bulk_updated: "uređene sobe",
    equipment_bulk_updated: "uređena oprema",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}

function relativeTime(value: string) {
  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  if (diffMinutes < 1) return "upravo sada";
  if (diffMinutes < 60) return `prije ${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `prije ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "jučer" : `prije ${days} dana`;
}

const EMPTY_OVERVIEW = {
  pendingOnlineCount: 0,
  todayOnlineCount: 0,
  todayAppointmentsCount: 0,
  tomorrowAppointmentsCount: 0,
  completedThisMonthCount: 0,
  noShowThisMonthCount: 0,
  onlineThisMonthCount: 0,
  onlineAcceptedThisMonthCount: 0,
  onlineConversionRate: 0,
};

export default async function DashboardPage() {
  const permissions = await requireDashboardUser();
  const canViewAudit = canAccessSettings(permissions.role);

  const [overdueAppointments, overviewStats, recentAudit] = await Promise.all([
    getOverdueScheduledAppointments(permissions.organizationId).catch(() => []),
    getDashboardOverviewStats(permissions.organizationId).catch(() => EMPTY_OVERVIEW),
    canViewAudit
      ? getAuditLogs({ pageSize: 5 }).catch(() => ({ items: [], total: 0 }))
      : Promise.resolve({ items: [], total: 0 }),
  ]);

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <OverdueAppointmentsPanel items={overdueAppointments} />

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-app-text">Dashboard</h1>
          <p className="mt-2 text-app-muted">
            {permissions.organizationName} — upravljanje terminima, klijentima i
            poslovanjem salona.
          </p>
        </div>

        <DashboardOverviewWidget
          pendingOnlineCount={overviewStats.pendingOnlineCount}
          todayOnlineCount={overviewStats.todayOnlineCount}
          todayAppointmentsCount={overviewStats.todayAppointmentsCount}
          tomorrowAppointmentsCount={overviewStats.tomorrowAppointmentsCount}
          completedThisMonthCount={overviewStats.completedThisMonthCount}
          noShowThisMonthCount={overviewStats.noShowThisMonthCount}
          onlineConversionRate={overviewStats.onlineConversionRate}
        />

        {canViewAudit ? (
          <section className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-app-card-alt p-2 text-app-accent">
                  <Activity className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-app-text">
                    Posljednje aktivnosti
                  </h2>
                  <p className="text-sm text-app-muted">
                    Najnovije promjene u sustavu.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/settings/audit-log"
                className="inline-flex items-center gap-2 text-sm font-semibold text-app-accent"
              >
                Prikaži sve <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 divide-y divide-app-soft">
              {recentAudit.items.length === 0 ? (
                <p className="py-5 text-sm text-app-muted">
                  Još nema zabilježenih aktivnosti.
                </p>
              ) : (
                recentAudit.items.map((log) => (
                  <Link
                    key={log.id}
                    href={`/dashboard/settings/audit-log?selected=${log.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition hover:bg-app-card-alt sm:px-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-app-text">
                        {log.actor_display_name ||
                          log.actor_email ||
                          "Nepoznati korisnik"}
                      </p>
                      <p className="truncate text-sm text-app-muted">
                        {actionLabel(log.action)}
                        {log.entity_label ? ` · ${log.entity_label}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-app-muted">
                      {relativeTime(log.created_at)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardLinkCard
            href="/dashboard/appointments"
            title="Termini"
            description="Pregled i upravljanje terminima."
            icon={Calendar}
          />
          <DashboardLinkCard
            href="/dashboard/calendar"
            title="Kalendar"
            description="Dnevni pregled termina."
            icon={Clock}
          />
          <DashboardLinkCard
            href="/dashboard/calendar/time-grid"
            title="Time-grid kalendar"
            description="Dnevni raspored po vremenskoj osi."
            icon={Clock}
          />
          <DashboardLinkCard
            href="/dashboard/clients"
            title="Klijenti"
            description="Pregled klijenata i povijesti termina."
            icon={Users}
          />
          {canAccessScheduleManagement(permissions.role) ? (
            <DashboardLinkCard
              href="/dashboard/schedule"
              title="Rasporedi"
              description="Upravljanje rasporedima zaposlenika."
              icon={UserCog}
            />
          ) : null}
          {canAccessReports(permissions.role) ? (
            <DashboardLinkCard
              href="/dashboard/reports"
              title="Reports"
              description="Pregled termina, statusa i statistike."
              icon={BarChart3}
            />
          ) : null}
          {canViewAudit ? (
            <DashboardLinkCard
              href="/dashboard/settings"
              title="Postavke"
              description="Upravljanje uslugama, sobama i pravilima."
              icon={Settings}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
