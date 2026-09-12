import { createClient } from "@/lib/supabase/server";

export type OverdueAppointmentItem = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  service: {
    id: string;
    name: string;
  } | null;
  employee: {
    id: string;
    display_name: string;
  } | null;
};

export async function getOverdueScheduledAppointments(organizationId: string) {
  const supabase = await createClient();

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      appointment_date,
      start_time,
      end_time,
      client_name,
      appointment_services (
        service_id,
        service_name,
        sort_order
      ),
      employee:employees (
        id,
        first_name,
        last_name
      )
    `,
    )
    .eq("organization_id", organizationId)
    .eq("status", "scheduled")
    .lte("appointment_date", todayStr)
    .order("appointment_date", { ascending: true })
    .order("end_time", { ascending: true });

  if (error) {
    console.error("Unable to load overdue appointments", error);
    return [];
  }

  const now = Date.now();

  const normalized: OverdueAppointmentItem[] = (data ?? []).map((item) => {
    const services = Array.isArray(item.appointment_services)
      ? [...item.appointment_services].sort(
          (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        )
      : [];
    const firstService = services[0] ?? null;
    const employee = Array.isArray(item.employee)
      ? (item.employee[0] ?? null)
      : (item.employee ?? null);

    return {
      id: String(item.id ?? ""),
      appointment_date: String(item.appointment_date ?? ""),
      start_time: String(item.start_time ?? ""),
      end_time: String(item.end_time ?? ""),
      client_name: String(item.client_name ?? ""),
      service: firstService
        ? {
            id: String(firstService.service_id ?? ""),
            name: String(firstService.service_name ?? ""),
          }
        : null,
      employee: employee
        ? {
            id: String(employee.id ?? ""),
            display_name: [employee.first_name, employee.last_name]
              .filter(Boolean)
              .join(" "),
          }
        : null,
    };
  });

  return normalized.filter((item) => {
    const end = new Date(
      `${item.appointment_date}T${item.end_time.slice(0, 5)}:00`,
    );
    return end.getTime() < now;
  });
}
