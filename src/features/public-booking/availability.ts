import { createAdminClient } from "@/lib/supabase/admin";
import { calculateTotalDuration } from "@/features/appointments/calculate-total-duration";
import type { AppointmentServiceInput } from "@/features/appointments/types";

type PublicAvailabilitySuggestion = {
  start_time: string;
  end_time: string;
  employee_id: string;
  employee_name: string;
  room_id: string;
  room_name: string;
};

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string | null;
};

type RoomRow = {
  id: string;
  name: string;
};

type AppointmentRow = {
  employee_id: string | null;
  room_id: string | null;
  start_time: string;
  end_time: string;
};

type ScheduleRow = {
  employee_id: string;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
};

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

function intersectIds(
  serviceIds: string[],
  rows: Array<{ service_id: string; target_id: string }>,
) {
  let result: Set<string> | null = null;

  for (const serviceId of serviceIds) {
    const current: Set<string> = new Set<string>(
      rows
        .filter((row) => row.service_id === serviceId)
        .map((row) => row.target_id),
    );

    if (result === null) {
      result = current;
    } else {
      const previousIds: string[] = Array.from(result);
      result = new Set<string>(
        previousIds.filter((id: string) => current.has(id)),
      );
    }
  }

  return result ?? new Set<string>();
}

export async function getPublicBookingAvailability(options: {
  organizationId: string;
  date: string;
  items: AppointmentServiceInput[];
  intervalMinutes?: number;
  maxSuggestions?: number;
}) {
  const {
    organizationId,
    date,
    items,
    intervalMinutes = 30,
    maxSuggestions = 999,
  } = options;

  if (!organizationId || !date || items.length === 0) {
    return {
      suggestions: [] as PublicAvailabilitySuggestion[],
      reason: "Datum i usluga su obavezni.",
    };
  }

  const totalDuration = calculateTotalDuration(items);
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
    return {
      suggestions: [] as PublicAvailabilitySuggestion[],
      reason: "Ukupno trajanje mora biti veće od 0.",
    };
  }

  const supabase = createAdminClient();
  const serviceIds = items.map((item) => item.service_id);
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();

  const [
    servicesResult,
    salonHoursResult,
    employeeMappingsResult,
    roomMappingsResult,
    employeesResult,
    roomsResult,
    appointmentsResult,
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, organization_id, is_active, is_online_bookable")
      .eq("organization_id", organizationId)
      .in("id", serviceIds)
      .eq("is_active", true)
      .eq("is_online_bookable", true),
    supabase
      .from("salon_working_hours")
      .select("opens_at, closes_at, is_closed")
      .eq("organization_id", organizationId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle(),
    supabase
      .from("employee_services")
      .select("employee_id, service_id")
      .eq("organization_id", organizationId)
      .in("service_id", serviceIds),
    supabase
      .from("service_rooms")
      .select("service_id, room_id")
      .eq("organization_id", organizationId)
      .in("service_id", serviceIds),
    supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("rooms")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("employee_id, room_id, start_time, end_time")
      .eq("organization_id", organizationId)
      .eq("appointment_date", date)
      .in("status", ["scheduled", "confirmed", "completed"]),
  ]);

  const firstError = [
    servicesResult.error,
    salonHoursResult.error,
    employeeMappingsResult.error,
    roomMappingsResult.error,
    employeesResult.error,
    roomsResult.error,
    appointmentsResult.error,
  ].find(Boolean);

  if (firstError) throw new Error(firstError.message);

  if ((servicesResult.data ?? []).length !== serviceIds.length) {
    return {
      suggestions: [] as PublicAvailabilitySuggestion[],
      reason: "Usluga nije dostupna za online rezervacije.",
    };
  }

  const salonDay = salonHoursResult.data;
  if (!salonDay || salonDay.is_closed) {
    return {
      suggestions: [] as PublicAvailabilitySuggestion[],
      reason: "Salon je zatvoren na odabrani datum.",
    };
  }

  const employeeMappingRows = (employeeMappingsResult.data ?? []).map((row) => ({
    service_id: row.service_id,
    target_id: row.employee_id,
  }));
  const roomMappingRows = (roomMappingsResult.data ?? []).map((row) => ({
    service_id: row.service_id,
    target_id: row.room_id,
  }));

  const allowedEmployeeIds = intersectIds(serviceIds, employeeMappingRows);
  const allowedRoomIds = intersectIds(serviceIds, roomMappingRows);

  const employees = ((employeesResult.data ?? []) as EmployeeRow[]).filter((employee) =>
    allowedEmployeeIds.has(employee.id),
  );
  const rooms = ((roomsResult.data ?? []) as RoomRow[]).filter((room) =>
    allowedRoomIds.has(room.id),
  );

  if (employees.length === 0) {
    return {
      suggestions: [] as PublicAvailabilitySuggestion[],
      reason: "Nema zaposlenika koji mogu raditi odabranu uslugu.",
    };
  }

  if (rooms.length === 0) {
    return {
      suggestions: [] as PublicAvailabilitySuggestion[],
      reason: "Nema prostorije koja podržava odabranu uslugu.",
    };
  }

  const employeeIds = employees.map((employee) => employee.id);
  const [defaultSchedulesResult, overridesResult] = await Promise.all([
    supabase
      .from("employee_default_schedule")
      .select(
        "employee_id, is_working, start_time, end_time, break_start_time, break_end_time",
      )
      .eq("organization_id", organizationId)
      .eq("day_of_week", dayOfWeek)
      .in("employee_id", employeeIds),
    supabase
      .from("employee_schedule_overrides")
      .select(
        "employee_id, is_working, start_time, end_time, break_start_time, break_end_time",
      )
      .eq("organization_id", organizationId)
      .eq("schedule_date", date)
      .in("employee_id", employeeIds),
  ]);

  if (defaultSchedulesResult.error) {
    throw new Error(defaultSchedulesResult.error.message);
  }
  if (overridesResult.error) throw new Error(overridesResult.error.message);

  const defaults = (defaultSchedulesResult.data ?? []) as ScheduleRow[];
  const overrides = (overridesResult.data ?? []) as ScheduleRow[];
  const effectiveSchedules = new Map<string, ScheduleRow>();

  for (const employee of employees) {
    const override = overrides.find((row) => row.employee_id === employee.id);
    const fallback = defaults.find((row) => row.employee_id === employee.id);
    const effective = override ?? fallback;
    if (effective) effectiveSchedules.set(employee.id, effective);
  }

  const appointments = (appointmentsResult.data ?? []) as AppointmentRow[];
  const salonOpen = timeToMinutes(salonDay.opens_at);
  const salonClose = timeToMinutes(salonDay.closes_at);
  const suggestions: PublicAvailabilitySuggestion[] = [];

  for (
    let start = salonOpen;
    start + totalDuration <= salonClose;
    start += intervalMinutes
  ) {
    const end = start + totalDuration;

    for (const employee of employees) {
      const schedule = effectiveSchedules.get(employee.id);
      if (!schedule?.is_working || !schedule.start_time || !schedule.end_time) {
        continue;
      }

      const employeeStart = timeToMinutes(schedule.start_time);
      const employeeEnd = timeToMinutes(schedule.end_time);
      if (start < employeeStart || end > employeeEnd) continue;

      if (
        schedule.break_start_time &&
        schedule.break_end_time &&
        overlaps(
          start,
          end,
          timeToMinutes(schedule.break_start_time),
          timeToMinutes(schedule.break_end_time),
        )
      ) {
        continue;
      }

      const employeeBusy = appointments.some(
        (appointment) =>
          appointment.employee_id === employee.id &&
          overlaps(
            start,
            end,
            timeToMinutes(appointment.start_time),
            timeToMinutes(appointment.end_time),
          ),
      );
      if (employeeBusy) continue;

      const room = rooms.find(
        (candidate) =>
          !appointments.some(
            (appointment) =>
              appointment.room_id === candidate.id &&
              overlaps(
                start,
                end,
                timeToMinutes(appointment.start_time),
                timeToMinutes(appointment.end_time),
              ),
          ),
      );
      if (!room) continue;

      suggestions.push({
        start_time: minutesToTime(start),
        end_time: minutesToTime(end),
        employee_id: employee.id,
        employee_name:
          [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
          "Zaposlenik",
        room_id: room.id,
        room_name: room.name,
      });

      if (suggestions.length >= maxSuggestions) {
        return { suggestions, reason: "" };
      }
    }
  }

  return {
    suggestions,
    reason:
      suggestions.length === 0
        ? "Nema slobodnih termina koji zadovoljavaju odabrana pravila."
        : "",
  };
}
