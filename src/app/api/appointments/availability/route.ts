import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

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

export async function GET(request: NextRequest) {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date")?.trim() ?? "";
  const startTime = searchParams.get("start_time")?.trim() ?? "";
  const serviceId = searchParams.get("service_id")?.trim() ?? "";
  const excludeAppointmentId = searchParams.get("exclude_appointment_id")?.trim() ?? "";

  if (!date || !startTime || !serviceId) {
    return NextResponse.json({ employees: [], rooms: [] });
  }

  const startMinutes = timeToMinutes(startTime);
  if (!Number.isFinite(startMinutes)) {
    return NextResponse.json({ error: "Vrijeme početka nije valjano." }, { status: 400 });
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
    return NextResponse.json({ error: serviceResult.error.message }, { status: 400 });
  }

  if (!serviceResult.data) {
    return NextResponse.json({ error: "Odabrana usluga nije pronađena." }, { status: 404 });
  }

  const durationMinutes = Number(serviceResult.data.duration_minutes ?? 0);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json({ error: "Usluga nema valjano trajanje." }, { status: 400 });
  }

  const endMinutes = startMinutes + durationMinutes;
  const endTime = minutesToTime(endMinutes);

  const [employeesResult, roomsResult, employeeMappingsResult, roomMappingsResult, appointmentsResult] =
    await Promise.all([
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
  const allowedRoomIds = new Set((roomMappingsResult.data ?? []).map((row) => row.room_id));

  const appointments = (appointmentsResult.data ?? []).filter(
    (appointment) => appointment.id !== excludeAppointmentId,
  );

  const employeesWithService = (employeesResult.data ?? []).filter((employee) =>
    allowedEmployeeIds.has(employee.id),
  );

  const scheduleRows = await Promise.all(
    employeesWithService.map(async (employee) => {
      const { data, error } = await supabase.rpc("get_employee_effective_schedule", {
        p_employee_id: employee.id,
        p_date: date,
      });

      if (error) {
        return { employeeId: employee.id, available: false };
      }

      const schedule = data?.[0];
      const scheduleStart = schedule?.start_time ? timeToMinutes(schedule.start_time) : null;
      const scheduleEnd = schedule?.end_time ? timeToMinutes(schedule.end_time) : null;
      const withinSchedule =
        Boolean(schedule?.is_working) &&
        scheduleStart !== null &&
        scheduleEnd !== null &&
        startMinutes >= scheduleStart &&
        endMinutes <= scheduleEnd;

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

      return { employeeId: employee.id, available: withinSchedule && !hasOverlap };
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
        [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Zaposlenik",
    }));

  const rooms = (roomsResult.data ?? [])
    .filter((room) => allowedRoomIds.has(room.id))
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

  return NextResponse.json({ employees, rooms, end_time: endTime });
}
