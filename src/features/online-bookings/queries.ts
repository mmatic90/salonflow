import { createClient } from "@/lib/supabase/server";
import { getSmartAvailability } from "@/features/availability/smart-availability";
import { getCurrentUserPermissions } from "@/lib/permissions";

export type OnlineBookingStatus =
  | "today"
  | "all"
  | "archive"
  | "pending"
  | "accepted"
  | "rejected";

type BookingEmployeeRelation = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_active?: boolean | null;
};

type NormalizedEmployee = {
  id: string;
  display_name: string;
};

type ActiveRoom = {
  id: string;
  name: string;
  is_active?: boolean | null;
};

const onlineBookingSelect = `
  *,
  services (
    id,
    name,
    duration_minutes
  ),
  suggested_employee:employees!online_booking_requests_suggested_employee_id_fkey (
    id,
    first_name,
    last_name
  ),
  suggested_room:rooms!online_booking_requests_suggested_room_id_fkey (
    id,
    name
  ),
  final_employee:employees!online_booking_requests_final_employee_id_fkey (
    id,
    first_name,
    last_name
  ),
  final_room:rooms!online_booking_requests_final_room_id_fkey (
    id,
    name
  )
`;

function normalizeEmployee(
  value: BookingEmployeeRelation | BookingEmployeeRelation[] | null | undefined,
): NormalizedEmployee | null {
  const employee = Array.isArray(value) ? value[0] ?? null : value ?? null;
  if (!employee) return null;
  return {
    id: String(employee.id),
    display_name:
      [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
      "Zaposlenik",
  };
}

function normalizeBookingRow<
  T extends {
    suggested_employee?: BookingEmployeeRelation | BookingEmployeeRelation[] | null;
    final_employee?: BookingEmployeeRelation | BookingEmployeeRelation[] | null;
  },
>(row: T) {
  return {
    ...row,
    suggested_employee: normalizeEmployee(row.suggested_employee),
    final_employee: normalizeEmployee(row.final_employee),
  };
}

async function getActiveOrganizationId() {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");
  return permissions.organizationId;
}

function getTodayValue() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function getOnlineBookings(status: OnlineBookingStatus = "pending") {
  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId();

  let query = supabase
    .from("online_booking_requests")
    .select(onlineBookingSelect)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (status === "archive") {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);

    if (status === "today") {
      query = query.eq("requested_date", getTodayValue());
    } else if (status !== "all") {
      query = query.eq("status", status);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeBookingRow);
}

export async function getPendingOnlineBookings() {
  return getOnlineBookings("pending");
}

export async function getOnlineBookingCounts() {
  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId();
  const todayValue = getTodayValue();

  const [
    { count: today },
    { count: all },
    { count: pending },
    { count: accepted },
    { count: rejected },
    { count: archive },
  ] = await Promise.all([
    supabase
      .from("online_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .eq("requested_date", todayValue),

    supabase
      .from("online_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null),

    supabase
      .from("online_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .eq("status", "pending"),

    supabase
      .from("online_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .eq("status", "accepted"),

    supabase
      .from("online_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .eq("status", "rejected"),

    supabase
      .from("online_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .not("archived_at", "is", null),
  ]);

  return {
    today: today ?? 0,
    all: all ?? 0,
    pending: pending ?? 0,
    accepted: accepted ?? 0,
    rejected: rejected ?? 0,
    archive: archive ?? 0,
  };
}

export async function getOnlineBookingRequestById(id: string) {
  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId();

  const { data, error } = await supabase
    .from("online_booking_requests")
    .select(onlineBookingSelect)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeBookingRow(data) : null;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTimeString(time: string, minutesToAdd: number) {
  return minutesToTime(timeToMinutes(time) + minutesToAdd);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export async function getOnlineBookingAcceptOptions(args: {
  serviceId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
}) {
  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId();

  const startTime = args.startTime.slice(0, 5);
  const endTime = addMinutesToTimeString(startTime, args.durationMinutes);

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const [
    { data: employeeMappings, error: employeeMappingsError },
    { data: roomMappings, error: roomMappingsError },
    { data: existingAppointments, error: appointmentsError },
  ] = await Promise.all([
    supabase
      .from("employee_services")
      .select(
        `
        employee_id,
        employees (
          id,
          first_name,
          last_name,
          is_active
        )
      `,
      )
      .eq("organization_id", organizationId)
      .eq("service_id", args.serviceId),

    supabase
      .from("service_rooms")
      .select(
        `
        room_id,
        rooms (
          id,
          name,
          is_active
        )
      `,
      )
      .eq("organization_id", organizationId)
      .eq("service_id", args.serviceId),

    supabase
      .from("appointments")
      .select("id, employee_id, room_id, start_time, end_time, status")
      .eq("organization_id", organizationId)
      .eq("appointment_date", args.date)
      .in("status", ["scheduled", "confirmed", "completed"]),
  ]);

  if (employeeMappingsError) throw new Error(employeeMappingsError.message);
  if (roomMappingsError) throw new Error(roomMappingsError.message);
  if (appointmentsError) throw new Error(appointmentsError.message);

  const mappedEmployees = (employeeMappings ?? [])
    .map((row) => {
      const employee = Array.isArray(row.employees)
        ? row.employees[0] ?? null
        : row.employees ?? null;

      if (!employee?.is_active) return null;

      return {
        id: String(employee.id),
        display_name:
          [employee.first_name, employee.last_name]
            .filter(Boolean)
            .join(" ") || "Zaposlenik",
      };
    })
    .filter((employee): employee is NormalizedEmployee => employee !== null);

  const mappedRooms: ActiveRoom[] = (roomMappings ?? []).flatMap((row) => {
    const room = Array.isArray(row.rooms)
      ? row.rooms[0] ?? null
      : row.rooms ?? null;

    if (!room?.is_active) return [];

    return [
      {
        id: String(room.id),
        name: String(room.name),
        is_active: room.is_active,
      },
    ];
  });

  const employeesWithAvailability = await Promise.all(
    mappedEmployees.map(async (employee) => {
      const { data: scheduleRows, error: scheduleError } = await supabase.rpc(
        "get_employee_effective_schedule",
        {
          p_employee_id: employee.id,
          p_date: args.date,
        },
      );

      if (scheduleError) return null;

      const schedule = scheduleRows?.[0];

      if (
        !schedule?.is_working ||
        !schedule?.start_time ||
        !schedule?.end_time
      ) {
        return null;
      }

      const employeeStart = timeToMinutes(schedule.start_time);
      const employeeEnd = timeToMinutes(schedule.end_time);

      if (startMinutes < employeeStart || endMinutes > employeeEnd) {
        return null;
      }

      const hasConflict = (existingAppointments ?? []).some((appointment) => {
        if (appointment.employee_id !== employee.id) return false;

        return overlaps(
          startMinutes,
          endMinutes,
          timeToMinutes(appointment.start_time),
          timeToMinutes(appointment.end_time),
        );
      });

      return hasConflict ? null : employee;
    }),
  );

  const availableEmployees = employeesWithAvailability.filter(
    (employee): employee is NormalizedEmployee => employee !== null,
  );

  const availableRooms = mappedRooms.filter((room) => {
    const hasConflict = (existingAppointments ?? []).some((appointment) => {
      if (appointment.room_id !== room.id) return false;

      return overlaps(
        startMinutes,
        endMinutes,
        timeToMinutes(appointment.start_time),
        timeToMinutes(appointment.end_time),
      );
    });

    return !hasConflict;
  });

  return {
    employees: availableEmployees,
    rooms: availableRooms,
  };
}

export async function getOnlineBookingAutoSuggestion(args: {
  date: string;
  serviceId: string;
  durationMinutes: number;
  requestedStartTime: string;
}) {
  const result = await getSmartAvailability({
    date: args.date,
    items: [
      {
        service_id: args.serviceId,
        duration_minutes: args.durationMinutes,
      },
    ],
    intervalMinutes: 30,
    maxSuggestions: 999,
  });

  const requestedStartTime = args.requestedStartTime.slice(0, 5);

  const exactSuggestion = result.suggestions.find(
    (suggestion) => suggestion.start_time.slice(0, 5) === requestedStartTime,
  );

  return {
    suggestion: exactSuggestion ?? result.suggestions[0] ?? null,
    reason: result.reason,
  };
}
