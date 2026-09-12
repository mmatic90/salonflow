import Link from "next/link";
import {
  Calendar,
  CalendarDays,
  BellRing,
  Plus,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ListPlus,
} from "lucide-react";
import { requireDashboardUser } from "@/lib/page-guards";
import OverdueAppointmentsPanel from "@/components/overdue-appointments-panel";
import { getOverdueScheduledAppointments } from "@/features/appointments/overdue-queries";
import DashboardOverviewWidget from "@/components/dashboard-overview-widget";
import { getDashboardOverviewStats } from "@/features/dashboard/overview-queries";
import { getAppointmentsByDate } from "@/features/appointments/queries";
import { formatAppointmentServicesLabel } from "@/features/appointments/format-appointment-services";
import { getWaitingWaitlistCount } from "@/features/waitlist/queries";
import {
  formatDateLabel,
  formatTime,
  getTodayLocalDate,
  statusLabel,
} from "@/lib/utils";
import { getDictionary } from "@/lib/i18n";

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
  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.dashboard;
  const today = getTodayLocalDate();
  const waitlistLabel =
    permissions.organizationLocale === "en"
      ? "Waitlist"
      : permissions.organizationLocale === "it"
        ? "Lista d'attesa"
        : "Lista čekanja";

  const [overdueAppointments, overviewStats, todayAppointments, waitlistCount] =
    await Promise.all([
      getOverdueScheduledAppointments(permissions.organizationId).catch(() => []),
      getDashboardOverviewStats(permissions.organizationId).catch(
        () => EMPTY_OVERVIEW,
      ),
      getAppointmentsByDate(today).catch(() => []),
      getWaitingWaitlistCount(permissions.organizationId).catch(() => 0),
    ]);

  const visibleTodayAppointments = todayAppointments
    .filter((appointment) => appointment.status !== "cancelled")
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <main className="min-h-screen bg-app-bg px-3 py-4 sm:px-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
        <OverdueAppointmentsPanel
          items={overdueAppointments}
          locale={permissions.organizationLocale}
        />

        <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="bg-gradient-to-br from-white via-white to-app-bg p-5 sm:p-6 md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-app-soft bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-app-accent shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  {formatDateLabel(today, permissions.organizationLocale)}
                </div>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-app-text md:text-4xl">
                  {t.today}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted sm:text-base">
                  {permissions.organizationName} — {t.todaysAppointments}
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
                  {t.calendar}
                </Link>
                <Link
                  href="/dashboard/waitlist"
                  className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 font-semibold text-app-text shadow-sm transition hover:-translate-y-0.5 hover:bg-app-card-alt sm:col-span-1"
                >
                  <ListPlus className="h-4 w-4" />
                  {waitlistLabel}
                  {waitlistCount > 0 ? (
                    <span className="rounded-full bg-app-accent/10 px-2 py-0.5 text-xs font-bold text-app-accent">
                      {waitlistCount}
                    </span>
                  ) : null}
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

        <section className="grid gap-5 xl:grid-cols-[1.55fr_0.75fr]">
          <div className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
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
                href={`/dashboard/calendar?date=${today}`}
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
                        {statusLabel(appointment.status, permissions.organizationLocale)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="self-start rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-app-muted">{t.onlineBookings}</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-app-text">
                  {t.bookingOverview}
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
                <BellRing className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-app-bg px-4 py-3.5">
                <span className="text-sm font-semibold text-app-muted">{t.pending}</span>
                <span className="text-2xl font-extrabold text-app-text">
                  {overviewStats.pendingOnlineCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-app-bg px-4 py-3.5">
                <span className="text-sm font-semibold text-app-muted">{t.today}</span>
                <span className="text-2xl font-extrabold text-app-text">
                  {overviewStats.todayOnlineCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-app-bg px-4 py-3.5">
                <span className="text-sm font-semibold text-app-muted">{t.conversion}</span>
                <span className="text-2xl font-extrabold text-app-text">
                  {overviewStats.onlineConversionRate}%
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-app-soft bg-white px-4 py-3">
              <div className="flex items-start gap-2 text-sm text-app-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  {overviewStats.onlineAcceptedThisMonthCount} {t.acceptedOfRequests}{" "}
                  {overviewStats.onlineThisMonthCount} {t.requestsThisMonth}
                </span>
              </div>
            </div>

            <Link
              href="/dashboard/online-bookings"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t.open} <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
