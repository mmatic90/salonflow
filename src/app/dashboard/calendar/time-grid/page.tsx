import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayLocalDate, formatTime, statusLabel } from "@/lib/utils";
import { requireDashboardUser } from "@/lib/page-guards";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import DateQueryPicker from "@/components/date-query-picker";
import TimeGridMobileSelect from "@/components/time-grid-mobile-select";
import {
  getTimeGridEmployeesView,
  getTimeGridRoomsView,
  type TimeGridAppointment,
  type TimeGridShift,
} from "@/features/calendar/time-grid-queries";
import EmptyStateCard from "@/components/empty-state-card";
import TimeGridLegendFilters from "@/components/time-grid-legend-filters";

type SearchParams = Promise<{
  date?: string;
  view?: string;
  employee?: string;
  room?: string;
  scheduled?: string;
  completed?: string;
  cancelled?: string;
  no_show?: string;
}>;

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT = 96;

function formatDateTitle(value: string, locale: AppLocale) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTop(minutes: number) {
  return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

function statusClasses(status: string) {
  switch (status) {
    case "scheduled":
      return "border-[#c7bcad] bg-[#ebe3d6]";
    case "completed":
      return "border-[#8a7d6f] bg-[#d8cec1]";
    case "cancelled":
      return "border-[#d8cdc0] bg-[#f2ece5] opacity-90";
    case "no_show":
      return "border-[#6a655f] bg-[#ded7cf]";
    default:
      return "border-app-soft bg-white";
  }
}

function statusAccent(status: string) {
  switch (status) {
    case "scheduled":
      return "bg-[#B0A695]";
    case "completed":
      return "bg-[#776B5D]";
    case "cancelled":
      return "bg-[#B0A695]";
    case "no_show":
      return "bg-[#4B4844]";
    default:
      return "bg-app-muted";
  }
}

function buildHalfHourLines() {
  const lines: number[] = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    lines.push(hour * 60);
    lines.push(hour * 60 + 30);
  }
  lines.push(END_HOUR * 60);
  return lines;
}

function getCurrentTimeMarkerTop(date: string) {
  const now = new Date();
  const target = new Date(`${date}T00:00:00`);

  if (
    now.getFullYear() !== target.getFullYear() ||
    now.getMonth() !== target.getMonth() ||
    now.getDate() !== target.getDate()
  ) {
    return null;
  }

  const minutes = now.getHours() * 60 + now.getMinutes();
  const minMinutes = START_HOUR * 60;
  const maxMinutes = END_HOUR * 60;

  if (minutes < minMinutes || minutes > maxMinutes) {
    return null;
  }

  return minutesToTop(minutes);
}

function HeaderChip({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
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

function filterAppointments(
  appointments: TimeGridAppointment[],
  filters: {
    showScheduled: boolean;
    showCompleted: boolean;
    showCancelled: boolean;
    showNoShow: boolean;
  },
) {
  return appointments.filter((appointment) => {
    if (appointment.status === "scheduled") return filters.showScheduled;
    if (appointment.status === "completed") return filters.showCompleted;
    if (appointment.status === "cancelled") return filters.showCancelled;
    if (appointment.status === "no_show") return filters.showNoShow;
    return true;
  });
}

function AppointmentBlock({
  appointment,
  top,
  height,
  locale,
}: {
  appointment: TimeGridAppointment;
  top: number;
  height: number;
  locale: AppLocale;
}) {
  return (
    <Link
      href={`/dashboard/appointments/${appointment.id}/edit`}
      className={`absolute left-2 right-2 overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${statusClasses(
        appointment.status,
      )}`}
      style={{ top, height }}
    >
      <div className="flex h-full">
        <div className={`w-1.5 shrink-0 ${statusAccent(appointment.status)}`} />

        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-app-muted">
              {formatTime(appointment.start_time)} -{" "}
              {formatTime(appointment.end_time)}
            </div>
            <div className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-app-text">
              {statusLabel(appointment.status, locale)}
            </div>
          </div>

          <div className="truncate text-sm font-semibold text-app-text">
            {appointment.client_name}
            {appointment.client_phone ? (
              <div className="truncate text-xs text-app-muted">
                {appointment.client_phone}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmployeeShiftBackground({
  shift,
  gridHeight,
}: {
  shift: TimeGridShift | undefined;
  gridHeight: number;
}) {
  if (!shift || !shift.is_working || !shift.start_time || !shift.end_time) {
    return (
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#efe5db]/80 to-[#e6d9cb]/40"
        style={{ height: gridHeight }}
      />
    );
  }

  const shiftStart = timeToMinutes(shift.start_time);
  const shiftEnd = timeToMinutes(shift.end_time);
  const workTop = minutesToTop(shiftStart);
  const workHeight = ((shiftEnd - shiftStart) / 60) * HOUR_HEIGHT;

  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#efe5db]/70 to-[#e6d9cb]/30"
        style={{ height: gridHeight }}
      />
      <div
        className="absolute left-0 right-0 border-y border-[#b0a695]/70 bg-gradient-to-b from-[#ddd3c5]/90 to-[#d3c8b8]/60"
        style={{
          top: workTop,
          height: workHeight,
        }}
      />
    </>
  );
}

function ShiftBadge({
  shift,
  notWorkingLabel,
}: {
  shift: TimeGridShift | undefined;
  notWorkingLabel: string;
}) {
  if (!shift || !shift.is_working || !shift.start_time || !shift.end_time) {
    return (
      <span className="rounded-full bg-[#efe5db] px-2.5 py-1 text-[11px] font-medium text-app-text">
        {notWorkingLabel}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#ddd3c5] px-2.5 py-1 text-[11px] font-medium text-app-text">
      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
    </span>
  );
}

export default async function TimeGridCalendarPage({
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
  const selectedDate = resolvedSearchParams.date || getTodayLocalDate();
  const selectedView =
    resolvedSearchParams.view === "rooms" ? "rooms" : "employees";

  const selectedEmployeeId = resolvedSearchParams.employee || "";
  const selectedRoomId = resolvedSearchParams.room || "";

  const showScheduled = resolvedSearchParams.scheduled !== "0";
  const showCompleted = resolvedSearchParams.completed !== "0";
  const showCancelled = resolvedSearchParams.cancelled !== "0";
  const showNoShow = resolvedSearchParams.no_show !== "0";

  const halfHourLines = buildHalfHourLines();
  const gridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
  const currentTimeTop = getCurrentTimeMarkerTop(selectedDate);

  const employeesView =
    selectedView === "employees"
      ? await getTimeGridEmployeesView(selectedDate)
      : null;

  const roomsView =
    selectedView === "rooms" ? await getTimeGridRoomsView(selectedDate) : null;

  const filteredEmployeesView = employeesView
    ? {
        ...employeesView,
        appointments: filterAppointments(employeesView.appointments, {
          showScheduled,
          showCompleted,
          showCancelled,
          showNoShow,
        }),
      }
    : null;

  const filteredRoomsView = roomsView
    ? {
        ...roomsView,
        appointments: filterAppointments(roomsView.appointments, {
          showScheduled,
          showCompleted,
          showCancelled,
          showNoShow,
        }),
      }
    : null;

  const hasAnyAppointments =
    selectedView === "employees"
      ? (filteredEmployeesView?.appointments.length ?? 0) > 0
      : (filteredRoomsView?.appointments.length ?? 0) > 0;

  const desktopEmployeeColumns = filteredEmployeesView?.employees ?? [];
  const desktopRoomColumns = filteredRoomsView?.rooms ?? [];

  const mobileEmployeeColumns =
    selectedView === "employees" && filteredEmployeesView
      ? filteredEmployeesView.employees.filter(
          (employee) =>
            employee.id ===
            (selectedEmployeeId ||
              filteredEmployeesView.employees[0]?.id ||
              ""),
        )
      : [];

  const mobileRoomColumns =
    selectedView === "rooms" && filteredRoomsView
      ? filteredRoomsView.rooms.filter(
          (room) =>
            room.id ===
            (selectedRoomId || filteredRoomsView.rooms[0]?.id || ""),
        )
      : [];

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1750px] space-y-6">
        <div className="rounded-3xl border border-app-soft bg-app-card p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-app-text md:text-3xl">
                {t.timeGridTitle}
              </h1>
              <p className="mt-2 text-sm text-app-muted md:text-base">
                {t.visualDailyScheduleFor} {formatDateTitle(selectedDate, permissions.organizationLocale)}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <DateQueryPicker
                locale={permissions.organizationLocale}
                value={selectedDate}
                basePath="/dashboard/calendar/time-grid"
                extraParams={{
                  view: selectedView,
                  scheduled: showScheduled ? "1" : "0",
                  completed: showCompleted ? "1" : "0",
                  cancelled: showCancelled ? "1" : "0",
                  no_show: showNoShow ? "1" : "0",
                }}
              />

              <Link
                href={`/dashboard/appointments/new?date=${selectedDate}`}
                className="inline-flex h-[42px] items-center justify-center rounded-xl bg-app-accent px-4 py-2 font-medium text-white transition hover:opacity-90"
              >
                {t.newAppointment}
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <HeaderChip
                active={selectedView === "employees"}
                href={`/dashboard/calendar/time-grid?date=${selectedDate}&view=employees&scheduled=${
                  showScheduled ? "1" : "0"
                }&completed=${showCompleted ? "1" : "0"}&cancelled=${
                  showCancelled ? "1" : "0"
                }&no_show=${showNoShow ? "1" : "0"}`}
              >
                {t.timeGridByEmployees}
              </HeaderChip>

              <HeaderChip
                active={selectedView === "rooms"}
                href={`/dashboard/calendar/time-grid?date=${selectedDate}&view=rooms&scheduled=${
                  showScheduled ? "1" : "0"
                }&completed=${showCompleted ? "1" : "0"}&cancelled=${
                  showCancelled ? "1" : "0"
                }&no_show=${showNoShow ? "1" : "0"}`}
              >
                {t.timeGridByRooms}
              </HeaderChip>

              <HeaderChip
                active={false}
                href={`/dashboard/calendar?date=${selectedDate}&view=employees`}
              >
                {t.cardView}
              </HeaderChip>
            </div>

            <TimeGridLegendFilters
              showScheduled={showScheduled}
              showCompleted={showCompleted}
              showCancelled={showCancelled}
              showNoShow={showNoShow}
            />
          </div>

          {selectedView === "employees" && filteredEmployeesView ? (
            <div className="mt-4 lg:hidden">
              <TimeGridMobileSelect
                label={t.employee}
                action="/dashboard/calendar/time-grid"
                name="employee"
                value={
                  selectedEmployeeId ||
                  filteredEmployeesView.employees[0]?.id ||
                  ""
                }
                hiddenFields={{
                  date: selectedDate,
                  view: "employees",
                  scheduled: showScheduled ? "1" : "0",
                  completed: showCompleted ? "1" : "0",
                  cancelled: showCancelled ? "1" : "0",
                  no_show: showNoShow ? "1" : "0",
                }}
                options={filteredEmployeesView.employees.map((employee) => ({
                  value: employee.id,
                  label: employee.display_name,
                }))}
              />
            </div>
          ) : null}

          {selectedView === "rooms" && filteredRoomsView ? (
            <div className="mt-4 lg:hidden">
              <TimeGridMobileSelect
                label={t.room}
                action="/dashboard/calendar/time-grid"
                name="room"
                value={selectedRoomId || filteredRoomsView.rooms[0]?.id || ""}
                hiddenFields={{
                  date: selectedDate,
                  view: "rooms",
                  scheduled: showScheduled ? "1" : "0",
                  completed: showCompleted ? "1" : "0",
                  cancelled: showCancelled ? "1" : "0",
                  no_show: showNoShow ? "1" : "0",
                }}
                options={filteredRoomsView.rooms.map((room) => ({
                  value: room.id,
                  label: room.name,
                }))}
              />
            </div>
          ) : null}
        </div>

        {hasAnyAppointments ? (
          <div className="rounded-3xl border border-app-soft bg-app-card shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
              <div
                className="grid min-w-[1280px]"
                style={{
                  gridTemplateColumns: `104px repeat(${Math.max(
                    selectedView === "employees"
                      ? desktopEmployeeColumns.length
                      : desktopRoomColumns.length,
                    1,
                  )}, minmax(280px, 1fr))`,
                }}
              >
                <div className="sticky left-0 top-0 z-30 border-b border-r border-app-soft bg-app-card px-4 py-4 font-semibold text-app-text">
                  {t.time}
                </div>

                {selectedView === "employees" &&
                  desktopEmployeeColumns.map((employee) => {
                    const shift = filteredEmployeesView?.shifts.find(
                      (item) => item.resource_id === employee.id,
                    );

                    return (
                      <div
                        key={employee.id}
                        className="sticky top-0 z-20 border-b border-r border-app-soft bg-app-card px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{
                                backgroundColor:
                                  employee.color_hex || "#999999",
                              }}
                            />
                            <span className="truncate font-semibold text-app-text">
                              {employee.display_name}
                            </span>
                          </div>
                          <ShiftBadge shift={shift} notWorkingLabel={t.notWorking} />
                        </div>
                      </div>
                    );
                  })}

                {selectedView === "rooms" &&
                  desktopRoomColumns.map((room) => (
                    <div
                      key={room.id}
                      className="sticky top-0 z-20 border-b border-r border-app-soft bg-app-card px-4 py-4"
                    >
                      <div className="font-semibold text-app-text">
                        {room.name}
                      </div>
                    </div>
                  ))}

                <div
                  className="relative border-r border-app-soft bg-app-card-alt"
                  style={{ height: gridHeight }}
                >
                  {halfHourLines.map((minutes, index) => {
                    const top = minutesToTop(minutes);
                    const isHour = minutes % 60 === 0;

                    return (
                      <div
                        key={`${minutes}-${index}`}
                        className={`absolute left-0 right-0 ${
                          isHour
                            ? "border-t border-app-soft"
                            : "border-t border-[#d8cec0]"
                        }`}
                        style={{ top }}
                      >
                        {isHour ? (
                          <div className="absolute -top-3 left-3 rounded bg-white px-1.5 text-xs font-semibold text-app-text shadow-sm">
                            {String(Math.floor(minutes / 60)).padStart(2, "0")}
                            :00
                          </div>
                        ) : (
                          <div className="absolute -top-2 left-4 rounded bg-app-card-alt px-1 text-[10px] text-app-muted">
                            :30
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {currentTimeTop !== null ? (
                    <div
                      className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                      style={{ top: currentTimeTop }}
                    >
                      <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full border-2 border-white bg-red-500 shadow" />
                      <span className="absolute -top-3 left-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                        {t.now}
                      </span>
                    </div>
                  ) : null}
                </div>

                {selectedView === "employees" &&
                  desktopEmployeeColumns.map((employee) => {
                    const employeeAppointments =
                      filteredEmployeesView?.appointments.filter(
                        (appointment) =>
                          appointment.employee?.id === employee.id,
                      ) ?? [];

                    const shift = filteredEmployeesView?.shifts.find(
                      (item) => item.resource_id === employee.id,
                    );

                    return (
                      <div
                        key={employee.id}
                        className="relative border-r border-app-soft"
                        style={{ height: gridHeight }}
                      >
                        <EmployeeShiftBackground
                          shift={shift}
                          gridHeight={gridHeight}
                        />

                        {halfHourLines.map((minutes, index) => {
                          const top = minutesToTop(minutes);
                          const isHour = minutes % 60 === 0;

                          return (
                            <div
                              key={`${minutes}-${index}`}
                              className={`absolute left-0 right-0 ${
                                isHour
                                  ? "border-t border-app-soft"
                                  : "border-t border-[#d8cec0]"
                              }`}
                              style={{ top }}
                            />
                          );
                        })}

                        {currentTimeTop !== null ? (
                          <div
                            className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                            style={{ top: currentTimeTop }}
                          />
                        ) : null}

                        {employeeAppointments.map((appointment) => {
                          const startMinutes = timeToMinutes(
                            appointment.start_time,
                          );
                          const endMinutes = timeToMinutes(
                            appointment.end_time,
                          );

                          const top = minutesToTop(startMinutes);
                          const height = Math.max(
                            ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT,
                            72,
                          );

                          return (
                            <AppointmentBlock
                              key={appointment.id}
                              appointment={appointment}
                              top={top}
                              height={height}
                              locale={permissions.organizationLocale}
                            />
                          );
                        })}
                      </div>
                    );
                  })}

                {selectedView === "rooms" &&
                  desktopRoomColumns.map((room) => {
                    const roomAppointments =
                      filteredRoomsView?.appointments.filter(
                        (appointment) => appointment.room?.id === room.id,
                      ) ?? [];

                    return (
                      <div
                        key={room.id}
                        className="relative border-r border-app-soft bg-white"
                        style={{ height: gridHeight }}
                      >
                        {halfHourLines.map((minutes, index) => {
                          const top = minutesToTop(minutes);
                          const isHour = minutes % 60 === 0;

                          return (
                            <div
                              key={`${minutes}-${index}`}
                              className={`absolute left-0 right-0 ${
                                isHour
                                  ? "border-t border-app-soft"
                                  : "border-t border-[#d8cec0]"
                              }`}
                              style={{ top }}
                            />
                          );
                        })}

                        {currentTimeTop !== null ? (
                          <div
                            className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                            style={{ top: currentTimeTop }}
                          />
                        ) : null}

                        {roomAppointments.map((appointment) => {
                          const startMinutes = timeToMinutes(
                            appointment.start_time,
                          );
                          const endMinutes = timeToMinutes(
                            appointment.end_time,
                          );

                          const top = minutesToTop(startMinutes);
                          const height = Math.max(
                            ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT,
                            72,
                          );

                          return (
                            <AppointmentBlock
                              key={appointment.id}
                              appointment={appointment}
                              top={top}
                              height={height}
                              locale={permissions.organizationLocale}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="p-4 lg:hidden">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "88px minmax(0,1fr)",
                }}
              >
                <div className="border-r border-app-soft bg-app-card-alt px-3 py-3 font-semibold text-app-text">
                  Vrijeme
                </div>

                <div className="border-b border-app-soft px-4 py-3 font-semibold text-app-text">
                  {selectedView === "employees"
                    ? (mobileEmployeeColumns[0]?.display_name ??
                      filteredEmployeesView?.employees[0]?.display_name ??
                      t.employee)
                    : (mobileRoomColumns[0]?.name ??
                      filteredRoomsView?.rooms[0]?.name ??
                      t.room)}
                </div>

                <div
                  className="relative border-r border-app-soft bg-app-card-alt"
                  style={{ height: gridHeight }}
                >
                  {halfHourLines.map((minutes, index) => {
                    const top = minutesToTop(minutes);
                    const isHour = minutes % 60 === 0;

                    return (
                      <div
                        key={`${minutes}-${index}`}
                        className={`absolute left-0 right-0 ${
                          isHour
                            ? "border-t border-app-soft"
                            : "border-t border-[#d8cec0]"
                        }`}
                        style={{ top }}
                      >
                        {isHour ? (
                          <div className="absolute -top-3 left-2 rounded bg-white px-1 text-[11px] font-semibold text-app-text shadow-sm">
                            {String(Math.floor(minutes / 60)).padStart(2, "0")}
                            :00
                          </div>
                        ) : (
                          <div className="absolute -top-2 left-3 rounded bg-app-card-alt px-1 text-[10px] text-app-muted">
                            :30
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {currentTimeTop !== null ? (
                    <div
                      className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                      style={{ top: currentTimeTop }}
                    />
                  ) : null}
                </div>

                <div className="relative" style={{ height: gridHeight }}>
                  {selectedView === "employees" ? (
                    <>
                      <EmployeeShiftBackground
                        shift={filteredEmployeesView?.shifts.find(
                          (item) =>
                            item.resource_id ===
                            (selectedEmployeeId ||
                              filteredEmployeesView?.employees[0]?.id ||
                              ""),
                        )}
                        gridHeight={gridHeight}
                      />

                      {halfHourLines.map((minutes, index) => {
                        const top = minutesToTop(minutes);
                        const isHour = minutes % 60 === 0;

                        return (
                          <div
                            key={`${minutes}-${index}`}
                            className={`absolute left-0 right-0 ${
                              isHour
                                ? "border-t border-app-soft"
                                : "border-t border-[#d8cec0]"
                            }`}
                            style={{ top }}
                          />
                        );
                      })}

                      {currentTimeTop !== null ? (
                        <div
                          className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                          style={{ top: currentTimeTop }}
                        />
                      ) : null}

                      {(
                        filteredEmployeesView?.appointments.filter(
                          (appointment) =>
                            appointment.employee?.id ===
                            (selectedEmployeeId ||
                              filteredEmployeesView?.employees[0]?.id ||
                              ""),
                        ) ?? []
                      ).map((appointment) => {
                        const startMinutes = timeToMinutes(
                          appointment.start_time,
                        );
                        const endMinutes = timeToMinutes(appointment.end_time);

                        const top = minutesToTop(startMinutes);
                        const height = Math.max(
                          ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT,
                          72,
                        );

                        return (
                          <AppointmentBlock
                            key={appointment.id}
                            appointment={appointment}
                            top={top}
                            height={height}
                          />
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {halfHourLines.map((minutes, index) => {
                        const top = minutesToTop(minutes);
                        const isHour = minutes % 60 === 0;

                        return (
                          <div
                            key={`${minutes}-${index}`}
                            className={`absolute left-0 right-0 ${
                              isHour
                                ? "border-t border-app-soft"
                                : "border-t border-[#d8cec0]"
                            }`}
                            style={{ top }}
                          />
                        );
                      })}

                      {currentTimeTop !== null ? (
                        <div
                          className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                          style={{ top: currentTimeTop }}
                        />
                      ) : null}

                      {(
                        filteredRoomsView?.appointments.filter(
                          (appointment) =>
                            appointment.room?.id ===
                            (selectedRoomId ||
                              filteredRoomsView?.rooms[0]?.id ||
                              ""),
                        ) ?? []
                      ).map((appointment) => {
                        const startMinutes = timeToMinutes(
                          appointment.start_time,
                        );
                        const endMinutes = timeToMinutes(appointment.end_time);

                        const top = minutesToTop(startMinutes);
                        const height = Math.max(
                          ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT,
                          72,
                        );

                        return (
                          <AppointmentBlock
                            key={appointment.id}
                            appointment={appointment}
                            top={top}
                            height={height}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyStateCard
            title={t.noAppointmentsSelectedDate}
            description={t.timeGridEmptyDescription}
            action={
              <Link
                href={`/dashboard/appointments/new?date=${selectedDate}`}
                className="inline-flex rounded-xl bg-app-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                {t.addNewAppointment}
              </Link>
            }
          />
        )}
      </div>
    </main>
  );
}
