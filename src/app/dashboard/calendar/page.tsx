import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  DoorOpen,
  Plus,
  Shapes,
  Timer,
  UserRound,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getCalendarDayDataByEmployees,
  getCalendarDayDataByRooms,
  type CalendarAppointmentItem,
} from "@/features/calendar/queries";
import { formatTime, getTodayLocalDate } from "@/lib/utils";
import DateQueryPicker from "@/components/date-query-picker";
import AppointmentMiniDetails from "@/components/appointment-mini-details";
import { getWorkStatusClasses } from "@/features/schedule/status-helpers";
import AutoSubmitSelect from "@/components/auto-submit-select";
import AppointmentStatusActions from "@/components/appointment-status-actions";
import EmptyStateCard from "@/components/empty-state-card";
import CalendarCurrentTime from "@/components/calendar-current-time";
import { formatAppointmentServicesLabel } from "@/features/appointments/format-appointment-services";

type SearchParams = Promise<{
  date?: string;
  view?: string;
  employee?: string;
  room?: string;
}>;

function formatDateTitle(value: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50/80";
    case "completed":
      return "border-slate-200 bg-slate-50";
    case "cancelled":
      return "border-rose-200 bg-rose-50/70 opacity-75";
    case "no_show":
      return "border-amber-200 bg-amber-50/80";
    default:
      return "border-app-soft bg-white";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "scheduled": return "Zakazan";
    case "confirmed": return "Potvrđen";
    case "completed": return "Odrađen";
    case "cancelled": return "Otkazan";
    case "no_show": return "Nije došao";
    default: return status;
  }
}

function ViewChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-app-accent text-white shadow-sm"
          : "border border-app-soft bg-white text-app-text hover:border-app-accent/30 hover:bg-app-bg"
      }`}
    >
      {children}
    </Link>
  );
}

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-app-soft bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-app-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-app-text">{value}</p>
          <p className="mt-1 text-xs text-app-muted">{detail}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent">
          {icon}
        </div>
      </div>
    </div>
  );
}

function CalendarCard({ appointment, colorHex, metaLabel }: { appointment: CalendarAppointmentItem; colorHex?: string | null; metaLabel?: string }) {
  const serviceLabel = formatAppointmentServicesLabel(
    appointment.appointment_services?.slice().sort((a, b) => a.sort_order - b.sort_order),
  );
  const accent = colorHex || appointment.employee?.color_hex || "#8a7d6f";

  return (
    <div className={`group relative overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${statusClasses(appointment.status)}`}>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: accent }} />
      <Link href={`/dashboard/appointments/${appointment.id}/edit`} className="block p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-app-text">
            <Clock3 className="h-4 w-4 text-app-muted" />
            {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
          </div>
          <span className="rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-app-text shadow-sm">
            {statusLabel(appointment.status)}
          </span>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-app-accent shadow-sm">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-app-text">{appointment.client_name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-app-text">
              <Shapes className="h-3.5 w-3.5 shrink-0 text-app-muted" />
              <span className="truncate">{serviceLabel}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-app-muted">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2.5 py-1">
            <Timer className="h-3.5 w-3.5" /> {appointment.duration_minutes} min
          </span>
          {metaLabel ? <span className="rounded-full bg-white/75 px-2.5 py-1">{metaLabel}</span> : null}
          {appointment.client_phone ? <span className="rounded-full bg-white/75 px-2.5 py-1">{appointment.client_phone}</span> : null}
        </div>

        <AppointmentMiniDetails
          clientName={appointment.client_name}
          serviceName={serviceLabel}
          startTime={formatTime(appointment.start_time)}
          endTime={formatTime(appointment.end_time)}
          durationMinutes={appointment.duration_minutes}
          extraLine={metaLabel}
        />
      </Link>

      <div className="border-t border-black/5 px-4 py-3 pl-5">
        <AppointmentStatusActions appointmentId={appointment.id} currentStatus={appointment.status} compact />
      </div>
    </div>
  );
}

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const today = getTodayLocalDate();
  const selectedDate = resolvedSearchParams.date || today;
  const selectedView = resolvedSearchParams.view === "rooms" ? "rooms" : "employees";

  const [roomGroups, employeeGroups] = await Promise.all([
    selectedView === "rooms" ? getCalendarDayDataByRooms(selectedDate) : Promise.resolve([]),
    selectedView === "employees" ? getCalendarDayDataByEmployees(selectedDate) : Promise.resolve([]),
  ]);

  const selectedEmployeeId = resolvedSearchParams.employee || "";
  const selectedRoomId = resolvedSearchParams.room || "";
  const mobileEmployeeGroups = selectedView === "employees" && employeeGroups.length
    ? [employeeGroups.find((group) => group.employeeId === selectedEmployeeId) || employeeGroups[0]]
    : employeeGroups;
  const mobileRoomGroups = selectedView === "rooms" && roomGroups.length
    ? [roomGroups.find((group) => group.roomId === selectedRoomId) || roomGroups[0]]
    : roomGroups;

  const appointments = selectedView === "employees"
    ? employeeGroups.flatMap((group) => group.appointments)
    : roomGroups.flatMap((group) => group.appointments);
  const uniqueAppointments = Array.from(new Map(appointments.map((appointment) => [appointment.id, appointment])).values());
  const activeAppointments = uniqueAppointments.filter((appointment) => appointment.status !== "cancelled");
  const uniqueClients = new Set(activeAppointments.map((appointment) => appointment.client_name.trim().toLocaleLowerCase("hr"))).size;
  const bookedMinutes = activeAppointments.reduce((sum, appointment) => sum + appointment.duration_minutes, 0);
  const workingEmployees = employeeGroups.filter((group) => group.workStatus.isWorking).length;
  const hours = Math.floor(bookedMinutes / 60);
  const minutes = bookedMinutes % 60;

  const previousDate = shiftDate(selectedDate, -1);
  const nextDate = shiftDate(selectedDate, 1);
  const isToday = selectedDate === today;

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-app-soft bg-app-card shadow-sm">
          <div className="border-b border-app-soft bg-gradient-to-br from-white to-app-bg p-5 md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold capitalize tracking-tight text-app-text md:text-3xl">{formatDateTitle(selectedDate)}</h1>
                  <CalendarCurrentTime selectedDate={selectedDate} today={today} />
                </div>

                <div className="mt-4 w-full max-w-xs">
                  <DateQueryPicker value={selectedDate} basePath="/dashboard/calendar" extraParams={{ view: selectedView }} />
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-3 self-start sm:items-end xl:self-center">
                <Link href={`/dashboard/appointments/new?date=${selectedDate}`} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-app-accent px-5 py-2 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <Plus className="h-4 w-4" /> Novi termin
                </Link>

                <div className="inline-flex self-end rounded-xl border border-app-soft bg-white p-1 shadow-sm">
                  <Link href={`/dashboard/calendar?date=${previousDate}&view=${selectedView}`} className="rounded-lg p-2.5 text-app-muted transition hover:bg-app-bg hover:text-app-text" aria-label="Prethodni dan">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Link href={`/dashboard/calendar?date=${today}&view=${selectedView}`} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${isToday ? "bg-app-accent text-white shadow-sm" : "text-app-text hover:bg-app-bg"}`}>Danas</Link>
                  <Link href={`/dashboard/calendar?date=${nextDate}&view=${selectedView}`} className="rounded-lg p-2.5 text-app-muted transition hover:bg-app-bg hover:text-app-text" aria-label="Sljedeći dan">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <ViewChip href={`/dashboard/calendar?date=${selectedDate}&view=employees`} active={selectedView === "employees"}>Po zaposlenicima</ViewChip>
              <ViewChip href={`/dashboard/calendar?date=${selectedDate}&view=rooms`} active={selectedView === "rooms"}>Po sobama</ViewChip>
            </div>

            <div className="mt-4 lg:hidden">
              {selectedView === "employees" ? (
                <AutoSubmitSelect label="Zaposlenik" action="/dashboard/calendar" name="employee" value={selectedEmployeeId || employeeGroups[0]?.employeeId || ""} hiddenFields={{ date: selectedDate, view: "employees" }} options={employeeGroups.map((group) => ({ value: group.employeeId, label: group.employeeName }))} />
              ) : (
                <AutoSubmitSelect label="Soba" action="/dashboard/calendar" name="room" value={selectedRoomId || roomGroups[0]?.roomId || ""} hiddenFields={{ date: selectedDate, view: "rooms" }} options={roomGroups.map((group) => ({ value: group.roomId, label: group.roomName }))} />
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Termini" value={String(activeAppointments.length)} detail={`${uniqueAppointments.length - activeAppointments.length} otkazanih`} />
          <StatCard icon={<UserRound className="h-5 w-5" />} label="Klijenti" value={String(uniqueClients)} detail="jedinstvenih klijenata" />
          <StatCard icon={<Timer className="h-5 w-5" />} label="Rezervirano vrijeme" value={`${hours} h ${minutes} min`} detail="ukupno trajanje termina" />
          <StatCard icon={<UsersRound className="h-5 w-5" />} label="Aktivni kapacitet" value={selectedView === "employees" ? `${workingEmployees}/${employeeGroups.length}` : String(roomGroups.length)} detail={selectedView === "employees" ? "zaposlenika radi" : "aktivnih soba"} />
        </section>

        {selectedView === "rooms" ? (
          <>
            <div className="grid gap-6 lg:hidden">
              {mobileRoomGroups.map((group) => (
                <section key={group.roomId} className="rounded-3xl border border-app-soft bg-app-card shadow-sm">
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-3xl border-b border-app-soft bg-app-card/95 p-5 backdrop-blur">
                    <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent"><DoorOpen className="h-5 w-5" /></div><h2 className="text-lg font-bold text-app-text">{group.roomName}</h2></div>
                    <span className="rounded-full bg-app-bg px-3 py-1 text-xs font-semibold text-app-text">{group.appointments.length} termina</span>
                  </div>
                  <div className="p-5">{group.appointments.length ? <div className="space-y-3">{group.appointments.map((appointment) => <CalendarCard key={appointment.id} appointment={appointment} metaLabel={appointment.employee ? `Zaposlenik: ${appointment.employee.display_name}` : "Bez zaposlenika"} />)}</div> : <EmptyStateCard title="Nema termina u ovoj sobi" description="Za odabrani datum nema rezervacija u ovoj sobi." />}</div>
                </section>
              ))}
            </div>
            <div className="hidden gap-6 lg:grid xl:grid-cols-3">
              {roomGroups.map((group) => (
                <section key={group.roomId} className="min-w-0 rounded-3xl border border-app-soft bg-app-card shadow-sm">
                  <div className="sticky top-4 z-10 flex items-center justify-between gap-3 rounded-t-3xl border-b border-app-soft bg-app-card/95 p-5 backdrop-blur"><div className="flex items-center gap-3"><DoorOpen className="h-5 w-5 text-app-accent" /><h2 className="font-bold text-app-text">{group.roomName}</h2></div><span className="rounded-full bg-app-bg px-3 py-1 text-xs font-semibold">{group.appointments.length}</span></div>
                  <div className="p-5">{group.appointments.length ? <div className="space-y-3">{group.appointments.map((appointment) => <CalendarCard key={appointment.id} appointment={appointment} metaLabel={appointment.employee ? `Zaposlenik: ${appointment.employee.display_name}` : "Bez zaposlenika"} />)}</div> : <EmptyStateCard title="Nema termina" description="Za odabrani datum nema rezervacija u ovoj sobi." />}</div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-6 lg:hidden">
              {mobileEmployeeGroups.map((group) => (
                <section key={group.employeeId} className="rounded-3xl border border-app-soft bg-app-card shadow-sm">
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-3xl border-b border-app-soft bg-app-card/95 p-5 backdrop-blur">
                    <div className="flex items-center gap-3"><span className="h-11 w-2 rounded-full" style={{ backgroundColor: group.colorHex || "#999" }} /><div><h2 className="text-lg font-bold text-app-text">{group.employeeName}</h2><span className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getWorkStatusClasses(group.workStatus)}`}>{group.workStatus.label}</span></div></div>
                    <span className="rounded-full bg-app-bg px-3 py-1 text-xs font-semibold text-app-text">{group.appointments.length} termina</span>
                  </div>
                  <div className="p-5">{group.appointments.length ? <div className="space-y-3">{group.appointments.map((appointment) => <CalendarCard key={appointment.id} appointment={appointment} colorHex={group.colorHex} metaLabel={appointment.room ? `Soba: ${appointment.room.name}` : "Bez sobe"} />)}</div> : <EmptyStateCard title="Nema termina" description="Za odabrani datum ovaj zaposlenik nema rezerviranih termina." />}</div>
                </section>
              ))}
            </div>
            <div className="hidden gap-6 lg:grid xl:grid-cols-3">
              {employeeGroups.map((group) => (
                <section key={group.employeeId} className="min-w-0 rounded-3xl border border-app-soft bg-app-card shadow-sm">
                  <div className="sticky top-4 z-10 flex items-center justify-between gap-3 rounded-t-3xl border-b border-app-soft bg-app-card/95 p-5 backdrop-blur"><div className="flex items-center gap-3"><span className="h-11 w-2 rounded-full" style={{ backgroundColor: group.colorHex || "#999" }} /><div><h2 className="font-bold text-app-text">{group.employeeName}</h2><span className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getWorkStatusClasses(group.workStatus)}`}>{group.workStatus.label}</span></div></div><span className="rounded-full bg-app-bg px-3 py-1 text-xs font-semibold">{group.appointments.length}</span></div>
                  <div className="p-5">{group.appointments.length ? <div className="space-y-3">{group.appointments.map((appointment) => <CalendarCard key={appointment.id} appointment={appointment} colorHex={group.colorHex} metaLabel={appointment.room ? `Soba: ${appointment.room.name}` : "Bez sobe"} />)}</div> : <EmptyStateCard title="Nema termina" description="Za odabrani datum ovaj zaposlenik nema rezerviranih termina." />}</div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
