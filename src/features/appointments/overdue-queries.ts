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

export async function getOverdueScheduledAppointments() {
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
      service:services (
        id,
        name
      ),
      employee:employees (
        id,
        display_name
      )
    `,
    )
    .eq("status", "scheduled")
    .lte("appointment_date", todayStr)
    .order("appointment_date", { ascending: true })
    .order("end_time", { ascending: true });

  if (error) {
    const missingTable =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message?.toLowerCase().includes("appointments");

    if (missingTable) {
      return [];
    }

    throw new Error("Nije moguće dohvatiti overdue termine.");
  }

  const now = Date.now();

  const normalized: OverdueAppointmentItem[] = (data ?? []).map((item: any) => {
    const service = Array.isArray(item.service)
      ? (item.service[0] ?? null)
      : (item.service ?? null);

    const employee = Array.isArray(item.employee)
      ? (item.employee[0] ?? null)
      : (item.employee ?? null);

    return {
      id: String(item.id ?? ""),
      appointment_date: String(item.appointment_date ?? ""),
      start_time: String(item.start_time ?? ""),
      end_time: String(item.end_time ?? ""),
      client_name: String(item.client_name ?? ""),
      service: service
        ? {
            id: String(service.id ?? ""),
            name: String(service.name ?? ""),
          }
        : null,
      employee: employee
        ? {
            id: String(employee.id ?? ""),
            display_name: String(employee.display_name ?? ""),
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
