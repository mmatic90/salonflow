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
  Wrench,
  Plus,
  CalendarDays,
  BellRing,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import DashboardOverviewWidget from "@/components/dashboard-overview-widget";
import { getDashboardOverviewStats } from "@/features/dashboard/overview-queries";
import { getAuditLogs } from "@/features/audit/queries";
import { getAppointmentsByDate } from "@/features/appointments/queries";
import { formatAppointmentServicesLabel } from "@/features/appointments/format-appointment-services";
import {
  formatDateLabel,
  formatTime,
  getTodayLocalDate,
  statusLabel,
} from "@/lib/utils";
import { getDictionary, type AppLocale } from "@/lib/i18n";

function actionLabel(action: string, locale: AppLocale) {
  const labels: Record<AppLocale, Record<string, string>> = {
    hr: {
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
    },
    en: {
      appointment_created: "appointment created",
      appointment_updated: "appointment updated",
      appointment_cancelled: "appointment cancelled",
      appointment_status_changed: "appointment status changed",
      appointment_deleted: "appointment deleted",
      client_created: "client created",
      client_updated: "client updated",
      client_deleted: "client deleted",
      employee_created: "employee created",
      employee_updated: "employee updated",
      service_created: "service created",
      services_bulk_updated: "services updated",
      rooms_bulk_updated: "rooms updated",
      equipment_bulk_updated: "equipment updated",
    },
    it: {
      appointment_created: "appuntamento creato",
      appointment_updated: "appuntamento modificato",
      appointment_cancelled: "appuntamento annullato",
      appointment_status_changed: "stato appuntamento modificato",
      appointment_deleted: "appuntamento eliminato",
      client_created: "cliente aggiunto",
      client_updated: "cliente modificato",
      client_deleted: "cliente eliminato",
      employee_created: "dipendente aggiunto",
      employee_updated: "dipendente modificato",
      service_created: "servizio aggiunto",
      services_bulk_updated: "servizi modificati",
      rooms_bulk_updated: "stanze modificate",
      equipment_bulk_updated: "attrezzatura modificata",
    },
  };
  return labels[locale][action] ?? action.replaceAll("_", " ");
}

function relativeTime(value: string, locale: AppLocale) {
  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  const hours = Math.floor(diffMinutes / 60);
  const days = Math.floor(hours / 24);

  if (locale === "en") {
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return diffMinutes + " min ago";
    if (hours < 24) return hours + " h ago";
    return days === 1 ? "yesterday" : days + " days ago";
  }

  if (locale === "it") {
    if (diffMinutes < 1) return "proprio ora";
    if (diffMinutes < 60) return diffMinutes + " min fa";
    if (hours < 24) return hours + " h fa";
    return days === 1 ? "ieri" : days + " giorni fa";
  }

  if (diffMinutes < 1) return "upravo sada";
  if (diffMinutes < 60) return "prije " + diffMinutes + " min";
  if (hours < 24) return "prije " + hours + " h";
  return days === 1 ? "jučer" : "prije " + days + " dana";
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
  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.dashboard;
  const today = getTodayLocalDate();

  const [overdueAppointments, overviewStats, recentAudit, todayAppointments] =
    await Promise.all([
      getOverdueScheduledAppointments(permissions.organizationId).catch(() => []),
      getDashboardOverviewStats(permissions.organizationId).catch(
        () => EMPTY_OVERVIEW,
      ),
      canViewAudit
        ? getAuditLogs({ pageSize: 5 }).catch(() => ({ items: [], total: 0 }))
        : Promise.resolve({ items: [], total: 0 }),
      getAppointmentsByDate(today).catch(() => []),
    ]);

  const visibleTodayAppointments = todayAppointments
    .filter((appointment) => appointment.status !== "cancelled")
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <main className="min-h-screen bg-app-bg px-3 py-4 sm:px-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
        <OverdueAppointmentsPanel items={overdueAppointments} />

        <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="bg-gradient-to-br from-white via-white to-app-bg p-5 sm:p-6 md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-app-soft bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-app-accent shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  {formatDateLabel(today)}
                </div>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-app-text md:text-4xl">{t.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted sm:text-base">
                  {permissions.organizationName} — {t.subtitle}
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:gap-3">
                <Link
                  href={`/dashboard/appointments/new?date=${today}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2.5 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  {t.newAppointment}
                </Link>
                <Link
                  href={`/dashboard/calendar?date=${today}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 font-semibold text-app-text shadow-sm transition hover:-translate-y-0.5 hover:bg-app-card-alt"
                >
                  <CalendarDays className="h-4 w-4" />
                  Kalendar
                </Link>
              </div>
            </div>
          </div>
        </section>

        <DashboardOverviewWidget
          locale={permissions.organizationLocale}
          todayAppointmentsCount={overviewStats.todayAppointmentsCount}
          tomorrowAppointmentsCount={overviewStats.tomorrowAppointmentsCount}
          completedThisMonthCount={overviewStats.completedThisMonthCount}
          noShowThisMonthCount={overviewStats.noShowThisMonthCount}
        />

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-app-muted">{t.onlineBookings}</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-app-text">{t.bookingOverview}</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
                <BellRing className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-app-bg p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{t.pending}</p>
                <p className="mt-2 text-2xl font-extrabold text-app-text">{overviewStats.pendingOnlineCount}</p>
              </div>
              <div className="rounded-2xl bg-app-bg p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{t.today}</p>
                <p className="mt-2 text-2xl font-extrabold text-app-text">{overviewStats.todayOnlineCount}</p>
              </div>
              <div className="rounded-2xl bg-app-bg p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{t.conversion}</p>
                <p className="mt-2 text-2xl font-extrabold text-app-text">{overviewStats.onlineConversionRate}%</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-app-soft bg-white px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-app-muted">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>{overviewStats.onlineAcceptedThisMonthCount} {t.acceptedOfRequests} {overviewStats.onlineThisMonthCount} {t.requestsThisMonth}</span>
              </div>
              <Link href="/dashboard/online-bookings" className="shrink-0 text-sm font-semibold text-app-accent">
                Otvori
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-app-soft bg-gradient-to-br from-app-accent/10 via-white to-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
            <p className="text-sm font-semibold text-app-muted">{t.quickAccess}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-app-text">{t.commonActions}</h2>
            <div className="mt-5 grid gap-2">
              <Link href="/dashboard/clients" className="flex items-center justify-between rounded-2xl border border-app-soft bg-white px-4 py-3 font-semibold text-app-text transition hover:-translate-y-0.5 hover:shadow-sm">
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-app-accent" /> {t.clients}</span>
                <ArrowRight className="h-4 w-4 text-app-muted" />
              </Link>
              <Link href="/dashboard/schedule" className="flex items-center justify-between rounded-2xl border border-app-soft bg-white px-4 py-3 font-semibold text-app-text transition hover:-translate-y-0.5 hover:shadow-sm">
                <span className="flex items-center gap-2"><UserCog className="h-4 w-4 text-app-accent" /> {t.schedules}</span>
                <ArrowRight className="h-4 w-4 text-app-muted" />
              </Link>
              <Link href="/dashboard/reports" className="flex items-center justify-between rounded-2xl border border-app-soft bg-white px-4 py-3 font-semibold text-app-text transition hover:-translate-y-0.5 hover:shadow-sm">
                <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-app-accent" /> {t.reports}</span>
                <ArrowRight className="h-4 w-4 text-app-muted" />
              </Link>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 border-b border-app-soft bg-gradient-to-r from-white to-app-bg/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-app-text">{t.todaysAppointments}</h2>
              <p className="mt-1 text-sm text-app-muted">
                {visibleTodayAppointments.length === 0
                  ? t.noActiveToday
                  : visibleTodayAppointments.length + " " + t.activeAppointmentsSuffix}
              </p>
            </div>
            <Link
              href={`/dashboard/appointments?date=${today}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-app-accent"
            >
              {t.showAll} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {visibleTodayAppointments.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-app-muted" />
              <p className="mt-3 font-semibold text-app-text">
                {t.emptyScheduleTitle}
              </p>
              <p className="mt-1 text-sm text-app-muted">
                {t.emptyScheduleText}
              </p>
              <Link
                href={`/dashboard/appointments/new?date=${today}`}
                className="mt-4 inline-flex rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {t.addFirstAppointment}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-app-soft">
              {visibleTodayAppointments.slice(0, 8).map((appointment) => {
                const services = formatAppointmentServicesLabel(
                  appointment.appointment_services
                    ?.slice()
                    .sort((a, b) => a.sort_order - b.sort_order),
                );
                const employeeName =
                  appointment.employee?.display_name ?? t.unknownEmployee;
                const roomName = appointment.room?.name ?? t.noRoom;
                const employeeColor =
                  appointment.employee?.color_hex || "#999999";

                return (
                  <Link
                    key={appointment.id}
                    href={`/dashboard/appointments/${appointment.id}/edit`}
                    className="group grid gap-3 border-l-4 border-transparent p-4 transition hover:border-l-app-accent hover:bg-app-card-alt sm:grid-cols-[110px_1.2fr_1fr_auto] sm:items-center sm:px-6"
                  >
                    <div>
                      <p className="text-lg font-extrabold tracking-tight text-app-text">
                        {formatTime(appointment.start_time)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-app-muted">
                        {t.until} {formatTime(appointment.end_time)} · {appointment.duration_minutes} min
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-app-text">
                        {appointment.client_name}
                      </p>
                      <p className="mt-1 truncate text-sm text-app-muted">
                        {services}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: employeeColor }}
                        />
                        <span className="truncate text-sm font-medium text-app-text">
                          {employeeName}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-app-muted">
                        {roomName}
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-app-soft bg-white px-3 py-1 text-xs font-semibold text-app-text shadow-sm">
                      {statusLabel(appointment.status)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {canViewAudit ? (
          <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent shadow-sm">
                  <Activity className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-app-text">
                    {t.recentActivity}
                  </h2>
                  <p className="text-sm text-app-muted">
                    {t.recentActivityText}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/settings/audit-log"
                className="inline-flex items-center gap-2 text-sm font-semibold text-app-accent"
              >
                {t.showAll} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 divide-y divide-app-soft">
              {recentAudit.items.length === 0 ? (
                <p className="py-5 text-sm text-app-muted">
                  {t.noActivity}
                </p>
              ) : (
                recentAudit.items.map((log) => (
                  <Link
                    key={log.id}
                    href={`/dashboard/settings/audit-log?selected=${log.id}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl py-3 transition hover:bg-app-card-alt sm:px-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-app-text">
                        {log.actor_display_name ||
                          log.actor_email ||
                          t.unknownUser}
                      </p>
                      <p className="truncate text-sm text-app-muted">
                        {actionLabel(log.action, permissions.organizationLocale)}
                        {log.entity_label ? ` · ${log.entity_label}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-app-muted">
                      {relativeTime(log.created_at, permissions.organizationLocale)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold text-app-muted">{t.navigation}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-app-text">{t.salonManagement}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardLinkCard
            href="/dashboard/appointments"
            title={dictionary.nav.appointments}
            description={t.appointmentsDescription}
            icon={Calendar}
          />
          <DashboardLinkCard
            href="/dashboard/calendar"
            title={dictionary.nav.calendar}
            description={t.calendarDescription}
            icon={Clock}
          />
          <DashboardLinkCard
            href="/dashboard/calendar/time-grid"
            title={t.timeGridTitle}
            description={t.timeGridDescription}
            icon={Clock}
          />
          <DashboardLinkCard
            href="/dashboard/clients"
            title={dictionary.nav.clients}
            description={t.clientsDescription}
            icon={Users}
          />
          {canViewAudit ? (
            <DashboardLinkCard
              href="/dashboard/setup"
              title={t.setup}
              description={t.setupDescription}
              icon={Wrench}
            />
          ) : null}
          {canAccessScheduleManagement(permissions.role) ? (
            <DashboardLinkCard
              href="/dashboard/schedule"
              title={dictionary.nav.schedule}
              description={t.schedulesDescription}
              icon={UserCog}
            />
          ) : null}
          {canAccessReports(permissions.role) ? (
            <DashboardLinkCard
              href="/dashboard/reports"
              title={dictionary.nav.reports}
              description={t.reportsDescription}
              icon={BarChart3}
            />
          ) : null}
          {canViewAudit ? (
            <DashboardLinkCard
              href="/dashboard/settings"
              title={dictionary.nav.settings}
              description={t.settingsDescription}
              icon={Settings}
            />
          ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
