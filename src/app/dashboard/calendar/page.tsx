import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCalendarDayDataByEmployees,
  getCalendarDayDataByRooms,
} from "@/features/calendar/queries";
import { formatTime, getTodayLocalDate } from "@/lib/utils";
import DateQueryPicker from "@/components/date-query-picker";
import AppointmentMiniDetails from "@/components/appointment-mini-details";
import { getWorkStatusClasses } from "@/features/schedule/status-helpers";
import AutoSubmitSelect from "@/components/auto-submit-select";
import AppointmentStatusActions from "@/components/appointment-status-actions";
import EmptyStateCard from "@/components/empty-state-card";
import { formatAppointmentServicesLabel } from "@/features/appointments/format-appointment-services";

type SearchParams = Promise<{
  date?: string;
  view?: string;
  employee?: string;
  room?: string;
}>;

function formatDateTitle(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("hr-HR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function statusClasses(status: string) {
  switch (status) {
    case "scheduled":
      return "border-[#c7bcad] bg-[#ebe3d6]";
    case "completed":
      return "border-[#8a7d6f] bg-[#d8cec1]";
    case "cancelled":
      return "border-[#d8cdc0] bg-[#f2ece5]";
    case "no_show":
      return "border-[#6a655f] bg-[#ded7cf]";
    default:
      return "border-app-soft bg-white";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "scheduled":
      return "Zakazan";
    case "completed":
      return "Odrađen";
    case "cancelled":
      return "Otkazan";
    case "no_show":
      return "Nije došao";
    default:
      return status;
  }
}

function ViewChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-app-accent text-white shadow-sm"
          : "border border-app-soft bg-white text-app-text hover:bg-app-bg"
      }`}
    >
      {children}
    </Link>
  );
}

function CalendarCard({
  appointment,
}: {
  appointment: {
    id: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
    client_name: string;
    client_phone: string | null;
    service: { name: string; service_group: string | null } | null;
    appointment_services?: {
      id: string;
      duration_minutes: number;
      sort_order: number;
      service: {
        id: string;
        name: string;
        service_group: string | null;
      } | null;
    }[];
    metaLabel?: string;
  };
}) {
  return (
    <Link
      href={`/dashboard/appointments/${appointment.id}/edit`}
      className={`group relative block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${statusClasses(
        appointment.status,
      )}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-app-text">
            {formatTime(appointment.start_time)} -{" "}
            {formatTime(appointment.end_time)}
          </div>
          <div className="mt-1 text-sm text-app-muted">
            {appointment.duration_minutes} min
          </div>
        </div>

        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-app-text">
          {statusLabel(appointment.status)}
        </span>
      </div>

      <div className="mt-4">
        <div className="font-medium text-app-text">
          {appointment.client_name}
        </div>

        <div className="mt-1 text-sm text-app-text">
          {formatAppointmentServicesLabel(
            appointment.appointment_services
              ?.slice()
              .sort((a, b) => a.sort_order - b.sort_order),
          )}
        </div>

        {appointment.service?.service_group ? (
          <div className="mt-1 text-xs text-app-muted">
            {appointment.service.service_group}
          </div>
        ) : null}
      </div>

      {appointment.metaLabel ? (
        <div className="mt-3 text-sm text-app-muted">
          {appointment.metaLabel}
        </div>
      ) : null}

      {appointment.client_phone ? (
        <div className="mt-2 text-xs text-app-muted">
          {appointment.client_phone}
        </div>
      ) : null}

      <div className="mt-3">
        <AppointmentStatusActions
          appointmentId={appointment.id}
          currentStatus={appointment.status}
          compact
        />
      </div>

      <AppointmentMiniDetails
        clientName={appointment.client_name}
        serviceName={formatAppointmentServicesLabel(
          appointment.appointment_services
            ?.slice()
            .sort((a, b) => a.sort_order - b.sort_order),
        )}
        startTime={formatTime(appointment.start_time)}
        endTime={formatTime(appointment.end_time)}
        durationMinutes={appointment.duration_minutes}
        extraLine={appointment.metaLabel}
      />
    </Link>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const selectedDate = resolvedSearchParams.date || getTodayLocalDate();
  const selectedView =
    resolvedSearchParams.view === "rooms" ? "rooms" : "employees";

  const roomGroups =
    selectedView === "rooms"
      ? await getCalendarDayDataByRooms(selectedDate)
      : [];

  const employeeGroups =
    selectedView === "employees"
      ? await getCalendarDayDataByEmployees(selectedDate)
      : [];

  const selectedEmployeeId = resolvedSearchParams.employee || "";
  const selectedRoomId = resolvedSearchParams.room || "";

  const mobileEmployeeGroups =
    selectedView === "employees" && selectedEmployeeId
      ? employeeGroups.filter(
          (group) => group.employeeId === selectedEmployeeId,
        )
      : selectedView === "employees" && employeeGroups.length > 0
        ? [employeeGroups[0]]
        : employeeGroups;

  const mobileRoomGroups =
    selectedView === "rooms" && selectedRoomId
      ? roomGroups.filter((group) => group.roomId === selectedRoomId)
      : selectedView === "rooms" && roomGroups.length > 0
        ? [roomGroups[0]]
        : roomGroups;

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-app-text md:text-3xl">
                Dnevni kalendar
              </h1>
              <p className="mt-2 text-sm text-app-muted md:text-base">
                Pregled termina za {formatDateTitle(selectedDate)}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <DateQueryPicker
                value={selectedDate}
                basePath="/dashboard/calendar"
                extraParams={{ view: selectedView }}
              />

              <Link
                href={`/dashboard/appointments/new?date=${selectedDate}`}
                className="inline-flex h-[42px] items-center justify-center rounded-xl bg-app-accent px-4 py-2 font-medium text-white transition hover:opacity-90"
              >
                Novi termin
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <ViewChip
              href={`/dashboard/calendar?date=${selectedDate}&view=employees`}
              active={selectedView === "employees"}
            >
              Prikaz po zaposlenicima
            </ViewChip>

            <ViewChip
              href={`/dashboard/calendar?date=${selectedDate}&view=rooms`}
              active={selectedView === "rooms"}
            >
              Prikaz po sobama
            </ViewChip>
          </div>

          {selectedView === "employees" ? (
            <div className="mt-4 lg:hidden">
              <AutoSubmitSelect
                label="Zaposlenik"
                action="/dashboard/calendar"
                name="employee"
                value={
                  selectedEmployeeId || employeeGroups[0]?.employeeId || ""
                }
                hiddenFields={{
                  date: selectedDate,
                  view: "employees",
                }}
                options={employeeGroups.map((group) => ({
                  value: group.employeeId,
                  label: group.employeeName,
                }))}
              />
            </div>
          ) : (
            <div className="mt-4 lg:hidden">
              <AutoSubmitSelect
                label="Soba"
                action="/dashboard/calendar"
                name="room"
                value={selectedRoomId || roomGroups[0]?.roomId || ""}
                hiddenFields={{
                  date: selectedDate,
                  view: "rooms",
                }}
                options={roomGroups.map((group) => ({
                  value: group.roomId,
                  label: group.roomName,
                }))}
              />
            </div>
          )}
        </div>

        {selectedView === "rooms" ? (
          <>
            <div className="grid gap-6 lg:hidden">
              {mobileRoomGroups.map((group) => (
                <section
                  key={group.roomId}
                  className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-app-text">
                      {group.roomName}
                    </h2>
                    <span className="rounded-full bg-app-bg px-3 py-1 text-xs font-medium text-app-text">
                      {group.appointments.length} termina
                    </span>
                  </div>

                  {group.appointments.length === 0 ? (
                    <EmptyStateCard
                      title="Nema termina u ovoj sobi"
                      description="Za odabrani datum nema rezervacija u ovoj sobi."
                    />
                  ) : (
                    <div className="space-y-3">
                      {group.appointments.map((appointment) => (
                        <CalendarCard
                          key={appointment.id}
                          appointment={{
                            ...appointment,
                            metaLabel: appointment.employee
                              ? `Zaposlenik: ${appointment.employee.display_name}`
                              : "Nepoznati zaposlenik",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <div className="hidden gap-6 lg:grid xl:grid-cols-3">
              {roomGroups.map((group) => (
                <section
                  key={group.roomId}
                  className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-app-text">
                      {group.roomName}
                    </h2>
                    <span className="rounded-full bg-app-bg px-3 py-1 text-xs font-medium text-app-text">
                      {group.appointments.length} termina
                    </span>
                  </div>

                  {group.appointments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-app-soft bg-app-card-alt p-4 text-sm text-app-muted">
                      Nema termina u ovoj sobi.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {group.appointments.map((appointment) => (
                        <CalendarCard
                          key={appointment.id}
                          appointment={{
                            ...appointment,
                            metaLabel: appointment.employee
                              ? `Zaposlenik: ${appointment.employee.display_name}`
                              : "Nepoznati zaposlenik",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-6 lg:hidden">
              {mobileEmployeeGroups.map((group) => (
                <section
                  key={group.employeeId}
                  className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block h-4 w-4 rounded-full"
                        style={{ backgroundColor: group.colorHex || "#999999" }}
                      />
                      <div>
                        <h2 className="text-xl font-semibold text-app-text">
                          {group.employeeName}
                        </h2>
                        <div
                          className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getWorkStatusClasses(
                            group.workStatus,
                          )}`}
                        >
                          {group.workStatus.label}
                        </div>
                      </div>
                    </div>

                    <span className="rounded-full bg-app-bg px-3 py-1 text-xs font-medium text-app-text">
                      {group.appointments.length} termina
                    </span>
                  </div>

                  {group.appointments.length === 0 ? (
                    <EmptyStateCard
                      title="Nema termina za ovog zaposlenika"
                      description="Za odabrani datum ovaj zaposlenik nema rezerviranih termina."
                    />
                  ) : (
                    <div className="space-y-3">
                      {group.appointments.map((appointment) => (
                        <CalendarCard
                          key={appointment.id}
                          appointment={{
                            ...appointment,
                            metaLabel: appointment.room
                              ? `Soba: ${appointment.room.name}`
                              : "Nepoznata soba",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <div className="hidden gap-6 lg:grid xl:grid-cols-3">
              {employeeGroups.map((group) => (
                <section
                  key={group.employeeId}
                  className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block h-4 w-4 rounded-full"
                        style={{ backgroundColor: group.colorHex || "#999999" }}
                      />
                      <div>
                        <h2 className="text-xl font-semibold text-app-text">
                          {group.employeeName}
                        </h2>
                        <div
                          className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getWorkStatusClasses(
                            group.workStatus,
                          )}`}
                        >
                          {group.workStatus.label}
                        </div>
                      </div>
                    </div>

                    <span className="rounded-full bg-app-bg px-3 py-1 text-xs font-medium text-app-text">
                      {group.appointments.length} termina
                    </span>
                  </div>

                  {group.appointments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-app-soft bg-app-card-alt p-4 text-sm text-app-muted">
                      Nema termina za ovog zaposlenika.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {group.appointments.map((appointment) => (
                        <CalendarCard
                          key={appointment.id}
                          appointment={{
                            ...appointment,
                            metaLabel: appointment.room
                              ? `Soba: ${appointment.room.name}`
                              : "Nepoznata soba",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
