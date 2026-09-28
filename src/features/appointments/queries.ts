import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import type { AppointmentListItem } from "./types";

function calculateDurationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = endTime.slice(0, 5).split(":").map(Number);
  return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute));
}

export async function getAppointmentsByDate(
  date: string,
): Promise<AppointmentListItem[]> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return [];
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      client_id,
      appointment_date,
      start_time,
      end_time,
      status,
      client_name,
      client_phone,
      client_email,
      notes,
      internal_notes,
      appointment_services (
        id,
        appointment_id,
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
    .eq("appointment_date", date)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Greška pri dohvaćanju termina:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error("Nije moguće dohvatiti termine.");
  }

  return (data ?? []).map((item) => {
    const room = Array.isArray(item.room) ? item.room[0] ?? null : item.room ?? null;
    const employee = Array.isArray(item.employee)
      ? item.employee[0] ?? null
      : item.employee ?? null;

    const appointmentServices = (item.appointment_services ?? []).map((entry) => {
      const service = Array.isArray(entry.service)
        ? entry.service[0] ?? null
        : entry.service ?? null;

      return {
        id: String(entry.id),
        service_id: String(entry.service_id ?? ""),
        duration_minutes: Number(entry.duration_minutes ?? 0),
        sort_order: Number(entry.sort_order ?? 0),
        service: {
          id: String(service?.id ?? entry.service_id ?? ""),
          name: String(service?.name ?? entry.service_name ?? "Usluga"),
          service_group: null,
        },
      };
    });

    const firstService = appointmentServices[0]?.service ?? null;

    return {
      id: String(item.id),
      appointment_date: String(item.appointment_date),
      start_time: String(item.start_time),
      end_time: String(item.end_time),
      duration_minutes: calculateDurationMinutes(
        String(item.start_time),
        String(item.end_time),
      ),
      status: item.status,
      client_name: String(item.client_name ?? ""),
      client_phone: item.client_phone ?? null,
      client_email: item.client_email ?? null,
      client_note: item.notes ?? null,
      internal_note: item.internal_notes ?? null,
      service: firstService
        ? {
            id: firstService.id,
            name: firstService.name,
            service_group: null,
            priority_room: null,
          }
        : null,
      appointment_services: appointmentServices,
      room: room
        ? {
            id: String(room.id),
            name: String(room.name),
          }
        : null,
      employee: employee
        ? {
            id: String(employee.id),
            display_name: [employee.first_name, employee.last_name]
              .filter(Boolean)
              .join(" "),
            color_hex: employee.color ?? null,
          }
        : null,
    } satisfies AppointmentListItem;
  });
}

export type AppointmentFormService = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  service_group: string | null;
  priority_room: string | null;
  is_active?: boolean;
};

export type AppointmentFormEmployee = {
  id: string;
  display_name: string;
  color_hex: string | null;
};

export type AppointmentFormRoom = {
  id: string;
  name: string;
};

export type AppointmentFormServiceRoom = {
  service_id: string;
  room_id: string;
};

export type AppointmentFormEmployeeService = {
  service_id: string;
  employee_id: string;
};

export type AppointmentEditServiceItem = {
  id: string;
  appointment_id: string;
  service_id: string;
  duration_minutes: number;
  sort_order: number;
  service: {
    id: string;
    name: string;
    description: string | null;
    service_group: string | null;
  } | null;
};

export type AppointmentEditItem = {
  id: string;
  client_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_note: string | null;
  internal_note: string | null;
  service_id: string;
  employee_id: string;
  room_id: string;
  appointment_services?: AppointmentEditServiceItem[];
};

export async function getAppointmentFormData() {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return {
      services: [],
      employees: [],
      rooms: [],
      serviceRooms: [],
      employeeServices: [],
    };
  }

  const [
    { data: services, error: servicesError },
    { data: employees, error: employeesError },
    { data: rooms, error: roomsError },
    { data: serviceRooms, error: serviceRoomsError },
    { data: employeeServices, error: employeeServicesError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price, is_active")
      .eq("organization_id", permissions.organizationId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("employees")
      .select("id, first_name, last_name, color")
      .eq("organization_id", permissions.organizationId)
      .eq("is_active", true)
      .order("first_name", { ascending: true }),
    supabase
      .from("rooms")
      .select("id, name")
      .eq("organization_id", permissions.organizationId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("service_rooms")
      .select("service_id, room_id")
      .eq("organization_id", permissions.organizationId),
    supabase
      .from("employee_services")
      .select("service_id, employee_id")
      .eq("organization_id", permissions.organizationId),
  ]);

  if (servicesError) throw new Error("Nije moguće dohvatiti usluge.");
  if (employeesError) throw new Error("Nije moguće dohvatiti zaposlenike.");
  if (roomsError) throw new Error("Nije moguće dohvatiti sobe.");
  if (serviceRoomsError) throw new Error("Nije moguće dohvatiti mapiranja usluga i soba.");
  if (employeeServicesError) throw new Error("Nije moguće dohvatiti mapiranja zaposlenika i usluga.");

  return {
    services: (services ?? []).map((service) => ({
      id: String(service.id),
      name: String(service.name),
      duration_minutes: Number(service.duration_minutes),
      price_cents: service.price == null ? null : Math.round(Number(service.price) * 100),
      service_group: null,
      priority_room: null,
      is_active: service.is_active,
    })) as AppointmentFormService[],
    employees: (employees ?? []).map((employee) => ({
      id: String(employee.id),
      display_name: [employee.first_name, employee.last_name].filter(Boolean).join(" "),
      color_hex: employee.color ?? null,
    })) as AppointmentFormEmployee[],
    rooms: (rooms ?? []) as AppointmentFormRoom[],
    serviceRooms: (serviceRooms ?? []).map((row) => ({
      service_id: String(row.service_id),
      room_id: String(row.room_id),
    })) as AppointmentFormServiceRoom[],
    employeeServices: (employeeServices ?? []).map((row) => ({
      service_id: String(row.service_id),
      employee_id: String(row.employee_id),
    })) as AppointmentFormEmployeeService[],
  };
}

export async function getAppointmentById(
  id: string,
): Promise<AppointmentEditItem | null> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();

  if (!permissions) return null;

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      client_id,
      appointment_date,
      start_time,
      end_time,
      status,
      client_name,
      client_phone,
      client_email,
      notes,
      internal_notes,
      employee_id,
      room_id,
      appointment_services (
        id,
        appointment_id,
        service_id,
        service_name,
        duration_minutes,
        sort_order,
        service:services (
          id,
          name,
          description
        )
      )
    `,
    )
    .eq("organization_id", permissions.organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const services = (data.appointment_services ?? []).map((entry) => {
    const service = Array.isArray(entry.service)
      ? entry.service[0] ?? null
      : entry.service ?? null;
    return {
      id: String(entry.id),
      appointment_id: String(entry.appointment_id),
      service_id: String(entry.service_id ?? ""),
      duration_minutes: Number(entry.duration_minutes),
      sort_order: Number(entry.sort_order),
      service: {
        id: String(service?.id ?? entry.service_id ?? ""),
        name: String(service?.name ?? entry.service_name ?? "Usluga"),
        description: service?.description ?? null,
        service_group: null,
      },
    };
  });

  return {
    id: String(data.id),
    client_id: data.client_id ?? null,
    appointment_date: String(data.appointment_date),
    start_time: String(data.start_time),
    end_time: String(data.end_time),
    duration_minutes: calculateDurationMinutes(String(data.start_time), String(data.end_time)),
    status: data.status,
    client_name: String(data.client_name),
    client_phone: data.client_phone ?? null,
    client_email: data.client_email ?? null,
    client_note: data.notes ?? null,
    internal_note: data.internal_notes ?? null,
    service_id: services[0]?.service_id ?? "",
    employee_id: data.employee_id ?? "",
    room_id: data.room_id ?? "",
    appointment_services: services,
  };
}