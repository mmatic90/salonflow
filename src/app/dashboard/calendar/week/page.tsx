import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCalendarWeekDataByEmployees } from "@/features/calendar/queries";
import { formatAppointmentServicesLabel } from "@/features/appointments/format-appointment-services";
import { formatTime, getTodayLocalDate, statusLabel } from "@/lib/utils";
import { requireDashboardUser } from "@/lib/page-guards";
import { getDictionary } from "@/lib/i18n";

type SearchParams = Promise<{
  week?: string;
}>;

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonday(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);

  return date;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateHr(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}.`;
}

function formatWeekTitle(weekStart: string, weekEnd: string) {
  return `${formatDateHr(weekStart)} - ${formatDateHr(weekEnd)}`;
}

function statusClass(status: string) {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 opacity-70";
  }

  if (status === "no_show") {
    return "border-zinc-300 bg-zinc-100";
  }

  return "border-[#c7bcad] bg-[#ebe3d6]";
}

function WeekAppointmentCard({
  appointment,
  locale,
  roomLabel,
}: {
  appointment: any;
  locale: "hr" | "en" | "it";
  roomLabel: string;
}) {
  const serviceLabel = formatAppointmentServicesLabel(
    appointment.appointment_services
      ?.slice()
      .sort((a: any, b: any) => a.sort_order - b.sort_order),
  );

  return (
    <Link
      href={`/dashboard/appointments/${appointment.id}/edit`}
      className={`block rounded-xl border p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${statusClass(
        appointment.status,
      )}`}
    >
      <div className="font-semibold text-app-text">
        {formatTime(appointment.start_time)} -{" "}
        {formatTime(appointment.end_time)}
      </div>

      <div className="mt-1 font-medium text-app-text">
        {appointment.client_name}
      </div>

      <div className="mt-1 text-xs text-app-muted">{serviceLabel}</div>

      {appointment.room?.name ? (
        <div className="mt-1 text-xs text-app-muted">
          {roomLabel}: {appointment.room.name}
        </div>
      ) : null}

      <div className="mt-2 inline-flex rounded-full bg-white/70 px-2 py-1 text-[11px] font-medium text-app-text">
        {statusLabel(appointment.status, locale)}
      </div>
    </Link>
  );
}

export default async function CalendarWeekPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const permissions = await requireDashboardUser();
  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.calendar;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const baseDate = resolvedSearchParams.week || getTodayLocalDate();

  const monday = getMonday(baseDate);
  const weekStart = formatDateInputValue(monday);
  const saturday = addDays(monday, 5);
  const weekEnd = formatDateInputValue(saturday);

  const previousWeek = formatDateInputValue(addDays(monday, -7));
  const nextWeek = formatDateInputValue(addDays(monday, 7));

  const weekDays = Array.from({ length: 6 }, (_, index) => {
    const date = addDays(monday, index);

    return {
      label: t.daysShort[index],
      value: formatDateInputValue(date),
      display: formatDateHr(formatDateInputValue(date)),
    };
  });

  const employeeGroups = await getCalendarWeekDataByEmployees({
    weekStart,
    weekEnd,
  });

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-app-text md:text-3xl">
                {t.weeklyTitle}
              </h1>
              <p className="mt-2 text-sm text-app-muted md:text-base">
                {t.weeklyOverview}{" "}
                <span className="font-medium text-app-text">
                  {formatWeekTitle(weekStart, weekEnd)}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/calendar/week?week=${previousWeek}`}
                className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
              >
                <ChevronLeft className="h-4 w-4" />
                {t.previousWeek}
              </Link>

              <Link
                href="/dashboard/calendar/week"
                className="inline-flex items-center justify-center rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
              >
                {t.thisWeek}
              </Link>

              <Link
                href={`/dashboard/calendar/week?week=${nextWeek}`}
                className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
              >
                {t.nextWeek}
                <ChevronRight className="h-4 w-4" />
              </Link>

              <Link
                href={`/dashboard/appointments/new?date=${weekStart}`}
                className="inline-flex items-center gap-2 rounded-xl bg-app-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                {t.newAppointment}
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/calendar"
              className="rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-medium text-app-text hover:bg-app-bg"
            >
              {t.dailyOverview}
            </Link>

            <Link
              href="/dashboard/calendar/time-grid"
              className="rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-medium text-app-text hover:bg-app-bg"
            >
              {t.timeGridTitle}
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {employeeGroups.map((employee) => (
            <section
              key={employee.employeeId}
              className="overflow-hidden rounded-2xl border border-app-soft bg-app-card shadow-sm"
            >
              <div className="flex items-center justify-between gap-4 border-b border-app-soft bg-app-card-alt px-5 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{
                      backgroundColor: employee.colorHex || "#999999",
                    }}
                  />
                  <h2 className="text-lg font-semibold text-app-text">
                    {employee.employeeName}
                  </h2>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-app-text">
                  {employee.appointments.length} {employee.appointments.length === 1 ? t.appointmentSingular : t.appointmentPlural}
                </span>
              </div>

              <div className="grid min-w-[980px] grid-cols-6">
                {weekDays.map((day) => {
                  const dayAppointments = employee.appointments.filter(
                    (appointment: any) =>
                      appointment.appointment_date === day.value,
                  );

                  return (
                    <div
                      key={`${employee.employeeId}-${day.value}`}
                      className="min-h-[180px] border-r border-app-soft p-3 last:border-r-0"
                    >
                      <div className="sticky top-0 z-10 mb-3 rounded-xl bg-app-card px-3 py-2">
                        <div className="text-sm font-semibold text-app-text">
                          {day.label}
                        </div>
                        <div className="text-xs text-app-muted">
                          {day.display}
                        </div>
                      </div>

                      {dayAppointments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-app-soft bg-app-card-alt p-3 text-xs text-app-muted">
                          {t.noAppointments}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dayAppointments.map((appointment: any) => (
                            <WeekAppointmentCard
                              key={appointment.id}
                              appointment={appointment}
                              locale={permissions.organizationLocale}
                              roomLabel={t.room}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
