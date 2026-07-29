import { createClient } from "@/lib/supabase/server";

export type TimeGridEmployee = {
  id: string;
  display_name: string;
  color_hex: string | null;
};

export type TimeGridRoom = {
  id: string;
  name: string;
};

export type TimeGridAppointment = {
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

export type TimeGridShift = {
  resource_id: string;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
};

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

async function getAppointments(date: string): Promise<TimeGridAppointment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      appointment_date,
      start_time,
      end_time,
      duration_minutes,
      status,
      client_name,
      client_phone,
      service:services (
        id,
        name,
        service_group
      ),
      room:rooms (
        id,
        name
      ),
      employee:employees (
        id,
        display_name,
        color_hex
      )
    `,
    )
    .eq("appointment_date", date)
    .order("start_time", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti termine.");
  }

  return (data ?? []).map((item: any) => {
    const service = getSingleRelation(item.service);
    const room = getSingleRelation(item.room);
    const employee = getSingleRelation(item.employee);

    return {
      id: String(item.id ?? ""),
      appointment_date: String(item.appointment_date ?? ""),
      start_time: String(item.start_time ?? ""),
      end_time: String(item.end_time ?? ""),
      duration_minutes: Number(item.duration_minutes ?? 0),
      status: item.status as
        | "scheduled"
        | "completed"
        | "cancelled"
        | "no_show",
      client_name: String(item.client_name ?? ""),
      client_phone: item.client_phone ? String(item.client_phone) : null,
      service: service
        ? {
            id: String(service.id ?? ""),
            name: String(service.name ?? ""),
            service_group: service.service_group
              ? String(service.service_group)
              : null,
          }
        : null,
      room: room
        ? {
            id: String(room.id ?? ""),
            name: String(room.name ?? ""),
          }
        : null,
      employee: employee
        ? {
            id: String(employee.id ?? ""),
            display_name: String(employee.display_name ?? ""),
            color_hex: employee.color_hex ? String(employee.color_hex) : null,
          }
        : null,
    };
  });
}

async function getEmployees(): Promise<TimeGridEmployee[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employees")
    .select("id, display_name, color_hex")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti zaposlenike.");
  }

  return (data ?? []) as TimeGridEmployee[];
}

async function getRooms(): Promise<TimeGridRoom[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti sobe.");
  }

  return (data ?? []) as TimeGridRoom[];
}

async function getEmployeeShifts(date: string): Promise<TimeGridShift[]> {
  const supabase = await createClient();

  const employees = await getEmployees();

  const shifts = await Promise.all(
    employees.map(async (employee) => {
      const { data, error } = await supabase.rpc(
        "get_employee_effective_schedule",
        {
          p_employee_id: employee.id,
          p_date: date,
        },
      );

      if (error) {
        console.error(error);
        return {
          resource_id: employee.id,
          is_working: false,
          start_time: null,
          end_time: null,
        };
      }

      const row = data?.[0];

      return {
        resource_id: employee.id,
        is_working: row?.is_working ?? false,
        start_time: row?.start_time ?? null,
        end_time: row?.end_time ?? null,
      };
    }),
  );

  return shifts;
}

export async function getTimeGridEmployeesView(date: string) {
  const [employees, appointments, shifts] = await Promise.all([
    getEmployees(),
    getAppointments(date),
    getEmployeeShifts(date),
  ]);

  return {
    employees,
    appointments,
    shifts,
  };
}

export async function getTimeGridRoomsView(date: string) {
  const [rooms, appointments] = await Promise.all([
    getRooms(),
    getAppointments(date),
  ]);

  return {
    rooms,
    appointments,
  };
}
