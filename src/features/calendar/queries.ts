import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

export type CalendarAppointmentItem = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  client_name: string;
  client_phone: string | null;
  service: {
    id: string;
    name: string;
    service_group: string | null;
  } | null;
  appointment_services: {
    id: string;
    duration_minutes: number;
    sort_order: number;
    service: {
      id: string;
      name: string;
      service_group: string | null;
    } | null;
  }[];
  room: {
    id: string;
    name: string;
  } | null;
  employee: {
    id: string;
    display_name: string;
    color_hex: string | null;
  } | null;
};

export type CalendarRoomGroup = {
  roomId: string;
  roomName: string;
  appointments: CalendarAppointmentItem[];
};

export type CalendarEmployeeGroup = {
  employeeId: string;
  employeeName: string;
  colorHex: string | null;
  workStatus: {
    isWorking: boolean;
    isOverride: boolean;
    label: string;
  };
  appointments: CalendarAppointmentItem[];
};

type CalendarServiceRelation = {
  id: string | null;
  name: string | null;
};

type CalendarAppointmentServiceRelation = {
  id: string | null;
  service_id: string | null;
  service_name: string | null;
  duration_minutes: number | null;
  sort_order: number | null;
  service: CalendarServiceRelation | CalendarServiceRelation[] | null;
};

type CalendarRoomRelation = {
  id: string | null;
  name: string | null;
};

type CalendarEmployeeRelation = {
  id: string | null;
  first_name: string | null;
  last_name: string | null;
  color: string | null;
};

type RawCalendarAppointment = {
  id: string | null;
  appointment_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: CalendarAppointmentItem["status"];
  client_name: string | null;
  client_phone: string | null;
  appointment_services: CalendarAppointmentServiceRelation[] | null;
  room: CalendarRoomRelation | CalendarRoomRelation[] | null;
  employee: CalendarEmployeeRelation | CalendarEmployeeRelation[] | null;
};

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function calculateDurationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = endTime.slice(0, 5).split(":").map(Number);

  return Math.max(
    0,
    endHour * 60 + endMinute - (startHour * 60 + startMinute),
  );
}

function mapAppointment(item: RawCalendarAppointment): CalendarAppointmentItem {
  const room = getSingleRelation(item.room);
  const employee = getSingleRelation(item.employee);

  const appointmentServices = (item.appointment_services ?? [])
    .map((entry) => {
      const service = getSingleRelation(entry.service);

      return {
        id: String(entry.id ?? ""),
        duration_minutes: Number(entry.duration_minutes ?? 0),
        sort_order: Number(entry.sort_order ?? 0),
        service: {
          id: String(service?.id ?? entry.service_id ?? ""),
          name: String(service?.name ?? entry.service_name ?? "Usluga"),
          service_group: null,
        },
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const firstService = appointmentServices[0]?.service ?? null;

  return {
    id: String(item.id ?? ""),
    appointment_date: String(item.appointment_date ?? ""),
    start_time: String(item.start_time ?? ""),
    end_time: String(item.end_time ?? ""),
    duration_minutes: calculateDurationMinutes(
      String(item.start_time ?? ""),
      String(item.end_time ?? ""),
    ),
    status: item.status,
    client_name: String(item.client_name ?? ""),
    client_phone: item.client_phone ? String(item.client_phone) : null,
    service: firstService,
    appointment_services: appointmentServices,
    room: room
      ? {
          id: String(room.id ?? ""),
          name: String(room.name ?? ""),
        }
      : null,
    employee: employee
      ? {
          id: String(employee.id ?? ""),
          display_name:
            [employee.first_name, employee.last_name]
              .filter(Boolean)
              .join(" ") || "Zaposlenik",
          color_hex: employee.color ? String(employee.color) : null,
        }
      : null,
  };
}

async function getCalendarAppointments(
  dateFrom: string,
  dateTo = dateFrom,
): Promise<CalendarAppointmentItem[]> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();

  if (!permissions) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      appointment_date,
      start_time,
      end_time,
      status,
      client_name,
      client_phone,
      appointment_services (
        id,
        service_id,
        service_name,
        duration_minutes,
        sort_order,
        service:services (
          id,
          name
        )
      ),
      room:rooms (
        id,
        name
      ),
      employee:employees (
        id,
        first_name,
        last_name,
        color
      )
    `,
    )
    .eq("organization_id", permissions.organizationId)
    .gte("appointment_date", dateFrom)
    .lte("appointment_date", dateTo)
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Greška pri dohvaćanju termina za kalendar:", error);
    throw new Error("Nije moguće dohvatiti termine za kalendar.");
  }

  return (data ?? []).map((item) => mapAppointment(item as RawCalendarAppointment));
}

export async function getCalendarDayDataByRooms(
  date: string,
): Promise<CalendarRoomGroup[]> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();

  if (!permissions) return [];

  const [{ data: rooms, error: roomsError }, appointments] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name")
      .eq("organization_id", permissions.organizationId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    getCalendarAppointments(date),
  ]);

  if (roomsError) {
    console.error(roomsError);
    throw new Error("Nije moguće dohvatiti sobe.");
  }

  return (rooms ?? []).map((room) => ({
    roomId: String(room.id),
    roomName: String(room.name),
    appointments: appointments.filter(
      (appointment) => appointment.room?.id === String(room.id),
    ),
  }));
}

export async function getCalendarDayDataByEmployees(
  date: string,
): Promise<CalendarEmployeeGroup[]> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();

  if (!permissions) return [];

  const [{ data: employees, error: employeesError }, appointments] =
    await Promise.all([
      supabase
        .from("employees")
        .select("id, first_name, last_name, color")
        .eq("organization_id", permissions.organizationId)
        .eq("is_active", true)
        .order("first_name", { ascending: true }),
      getCalendarAppointments(date),
    ]);

  if (employeesError) {
    console.error(employeesError);
    throw new Error("Nije moguće dohvatiti zaposlenike.");
  }

  const groups = await Promise.all(
    (employees ?? []).map(async (employee) => {
      const { data, error } = await supabase.rpc(
        "get_employee_effective_schedule",
        {
          p_employee_id: employee.id,
          p_date: date,
        },
      );

      let workStatus = {
        isWorking: false,
        isOverride: false,
        label: "Ne radi",
      };

      if (!error && data?.[0]) {
        const row = data[0];
        const isWorking = row.is_working === true;
        const source = row.source ?? "default";

        workStatus = {
          isWorking,
          isOverride: source !== "default",
          label: isWorking
            ? row.start_time && row.end_time
              ? `${String(row.start_time).slice(0, 5)} - ${String(row.end_time).slice(0, 5)}`
              : "Radi"
            : source === "vacation"
              ? "Godišnji"
              : source === "sick_leave"
                ? "Bolovanje"
                : source === "day_off"
                  ? "Slobodan dan"
                  : "Ne radi",
        };
      }

      const employeeId = String(employee.id);

      return {
        employeeId,
        employeeName:
          [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
          "Zaposlenik",
        colorHex: employee.color ?? null,
        workStatus,
        appointments: appointments.filter(
          (appointment) => appointment.employee?.id === employeeId,
        ),
      };
    }),
  );

  return groups;
}

export async function getCalendarWeekDataByEmployees(args: {
  weekStart: string;
  weekEnd: string;
}) {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();

  if (!permissions) return [];

  const [{ data: employees, error: employeesError }, appointments] =
    await Promise.all([
      supabase
        .from("employees")
        .select("id, first_name, last_name, color")
        .eq("organization_id", permissions.organizationId)
        .eq("is_active", true)
        .order("first_name", { ascending: true }),
      getCalendarAppointments(args.weekStart, args.weekEnd),
    ]);

  if (employeesError) {
    console.error(employeesError);
    throw new Error("Nije moguće dohvatiti zaposlenike.");
  }

  return (employees ?? []).map((employee) => {
    const employeeId = String(employee.id);

    return {
      employeeId,
      employeeName:
        [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
        "Zaposlenik",
      colorHex: employee.color ?? null,
      appointments: appointments.filter(
        (appointment) => appointment.employee?.id === employeeId,
      ),
    };
  });
}
