import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

type AvailabilityIssue =
  | "salon_closed"
  | "outside_salon_hours"
  | "no_employee_for_service"
  | "no_employee_available"
  | "no_room_for_service"
  | "no_room_available";

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function dayOfWeekForDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export async function GET(request: NextRequest) {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date")?.trim() ?? "";
  const startTime = searchParams.get("start_time")?.trim() ?? "";
  const serviceId = searchParams.get("service_id")?.trim() ?? "";
  const excludeAppointmentId =
    searchParams.get("exclude_appointment_id")?.trim() ?? "";

  if (!date || !startTime || !serviceId) {
    return NextResponse.json({
      employees: [],
      rooms: [],
      general_issue: null,
      employee_issue: null,
      room_issue: null,
      available: false,
    });
  }

  const startMinutes = timeToMinutes(startTime);
  if (!Number.isFinite(startMinutes)) {
    return NextResponse.json(
      { error: "Vrijeme početka nije valjano." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const organizationId = permissions.organizationId;

  const serviceResult = await supabase
    .from("services")
    .select("id, duration_minutes")
    .eq("id", serviceId)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceResult.error) {
    return NextResponse.json(
      { error: serviceResult.error.message },
      { status: 400 },
    );
  }

  if (!serviceResult.data) {
    return NextResponse.json(
      { error: "Odabrana usluga nije pronađena." },
      { status: 404 },
    );
  }

  const durationMinutes = Number(serviceResult.data.duration_minutes ?? 0);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json(
      { error: "Usluga nema valjano trajanje." },
      { status: 400 },
    );
  }

  const endMinutes = startMinutes + durationMinutes;
  const endTime = minutesToTime(endMinutes);

  const { data: salonDay, error: salonHoursError } = await supabase
    .from("salon_working_hours")
    .select("opens_at, closes_at, is_closed")
    .eq("organization_id", organizationId)
    .eq("day_of_week", dayOfWeekForDate(date))
    .maybeSingle();

  if (salonHoursError) {
    return NextResponse.json(
      { error: salonHoursError.message },
      { status: 400 },
    );
  }

  if (!salonDay || salonDay.is_closed) {
    return NextResponse.json({
      employees: [],
      rooms: [],
      end_time: endTime,
      general_issue: "salon_closed" satisfies AvailabilityIssue,
      employee_issue: null,
      room_issue: null,
      available: false,
    });
  }

  if (
    startMinutes < timeToMinutes(salonDay.opens_at) ||
    endMinutes > timeToMinutes(salonDay.closes_at)
  ) {
    return NextResponse.json({
      employees: [],
      rooms: [],
      end_time: endTime,
      general_issue: "outside_salon_hours" satisfies AvailabilityIssue,
      employee_issue: null,
      room_issue: null,
      available: false,
    });
  }

  const [
    employeesResult,
    roomsResult,
    employeeMappingsResult,
    roomMappingsResult,
    appointmentsResult,
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("first_name", { ascending: true }),
    supabase
      .from("rooms")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("employee_services")
      .select("employee_id")
      .eq("organization_id", organizationId)
      .eq("service_id", serviceId),
    supabase
      .from("service_rooms")
      .select("room_id")
      .eq("organization_id", organizationId)
      .eq("service_id", serviceId),
    supabase
      .from("appointments")
      .select("id, employee_id, room_id, start_time, end_time, status")
      .eq("organization_id", organizationId)
      .eq("appointment_date", date)
      .in("status", ["scheduled", "confirmed", "completed"]),
  ]);

  const firstError =
    employeesResult.error ||
    roomsResult.error ||
    employeeMappingsResult.error ||
    roomMappingsResult.error ||
    appointmentsResult.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  const allowedEmployeeIds = new Set(
    (employeeMappingsResult.data ?? []).map((row) => row.employee_id),
  );
  const allowedRoomIds = new Set(
    (roomMappingsResult.data ?? []).map((row) => row.room_id),
  );

  const appointments = (appointmentsResult.data ?? []).filter(
    (appointment) => appointment.id !== excludeAppointmentId,
  );

  const employeesWithService = (employeesResult.data ?? []).filter((employee) =>
    allowedEmployeeIds.has(employee.id),
  );

  const scheduleRows = await Promise.all(
    employeesWithService.map(async (employee) => {
      const [scheduleResult, breakResult] = await Promise.all([
        supabase.rpc("get_employee_effective_schedule", {
          p_employee_id: employee.id,
          p_date: date,
        }),
        supabase.rpc("get_employee_effective_break", {
          p_employee_id: employee.id,
          p_date: date,
        }),
      ]);

      if (scheduleResult.error) {
        return { employeeId: employee.id, available: false };
      }

      const schedule = scheduleResult.data?.[0];
      const scheduleStart = schedule?.start_time
        ? timeToMinutes(schedule.start_time)
        : null;
      const scheduleEnd = schedule?.end_time
        ? timeToMinutes(schedule.end_time)
        : null;
      const withinSchedule =
        Boolean(schedule?.is_working) &&
        scheduleStart !== null &&
        scheduleEnd !== null &&
        startMinutes >= scheduleStart &&
        endMinutes <= scheduleEnd;

      const employeeBreak = breakResult.error ? null : breakResult.data?.[0];
      const overlapsBreak = Boolean(
        employeeBreak?.break_start_time &&
          employeeBreak.break_end_time &&
          overlaps(
            startMinutes,
            endMinutes,
            timeToMinutes(employeeBreak.break_start_time),
            timeToMinutes(employeeBreak.break_end_time),
          ),
      );

      const hasOverlap = appointments.some(
        (appointment) =>
          appointment.employee_id === employee.id &&
          overlaps(
            startMinutes,
            endMinutes,
            timeToMinutes(appointment.start_time),
            timeToMinutes(appointment.end_time),
          ),
      );

      return {
        employeeId: employee.id,
        available: withinSchedule && !overlapsBreak && !hasOverlap,
      };
    }),
  );

  const availableEmployeeIds = new Set(
    scheduleRows.filter((row) => row.available).map((row) => row.employeeId),
  );

  const employees = employeesWithService
    .filter((employee) => availableEmployeeIds.has(employee.id))
    .map((employee) => ({
      id: employee.id,
      label:
        [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
        "Zaposlenik",
    }));

  const mappedRooms = (roomsResult.data ?? []).filter((room) =>
    allowedRoomIds.has(room.id),
  );

  const rooms = mappedRooms
    .filter(
      (room) =>
        !appointments.some(
          (appointment) =>
            appointment.room_id === room.id &&
            overlaps(
              startMinutes,
              endMinutes,
              timeToMinutes(appointment.start_time),
              timeToMinutes(appointment.end_time),
            ),
        ),
    )
    .map((room) => ({ id: room.id, label: room.name }));

  const employeeIssue: AvailabilityIssue | null =
    employeesWithService.length === 0
      ? "no_employee_for_service"
      : employees.length === 0
        ? "no_employee_available"
        : null;

  const roomIssue: AvailabilityIssue | null =
    mappedRooms.length === 0
      ? "no_room_for_service"
      : rooms.length === 0
        ? "no_room_available"
        : null;

  return NextResponse.json({
    employees,
    rooms,
    end_time: endTime,
    general_issue: null,
    employee_issue: employeeIssue,
    room_issue: roomIssue,
    available: employees.length > 0 && rooms.length > 0,
  });
}
