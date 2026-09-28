import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import type { AppointmentEditItem } from "@/features/appointments/queries";

function calculateDurationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = endTime.slice(0, 5).split(":").map(Number);

  return Math.max(
    0,
    endHour * 60 + endMinute - (startHour * 60 + startMinute),
  );
}

export async function getMultiTenantAppointmentById(
  appointmentId: string,
): Promise<AppointmentEditItem | null> {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return null;
  }

  const supabase = await createClient();

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
        employee_id,
        room_id,
        appointment_services (
          id,
          appointment_id,
          service_id,
          service_name,
          duration_minutes,
          sort_order
        )
      `,
    )
    .eq("id", appointmentId)
    .eq("organization_id", permissions.organizationId)
    .maybeSingle();

  if (error) {
    console.error("Greška pri dohvaćanju termina za uređivanje:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  const appointmentServices = (data.appointment_services ?? [])
    .slice()
    .sort(
      (a, b) =>
        Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
    )
    .map((entry) => ({
      id: String(entry.id),
      appointment_id: String(entry.appointment_id),
      service_id: String(entry.service_id ?? ""),
      duration_minutes: Number(entry.duration_minutes ?? 0),
      sort_order: Number(entry.sort_order ?? 0),
      service: {
        id: String(entry.service_id ?? ""),
        name: String(entry.service_name ?? "Usluga"),
        description: null,
        service_group: null,
      },
    }));

  const startTime = String(data.start_time ?? "");
  const endTime = String(data.end_time ?? "");

  return {
    id: String(data.id),
    client_id: data.client_id ? String(data.client_id) : null,
    appointment_date: String(data.appointment_date ?? ""),
    start_time: startTime,
    end_time: endTime,
    duration_minutes: calculateDurationMinutes(startTime, endTime),
    status: data.status,
    client_name: String(data.client_name ?? ""),
    client_phone: data.client_phone ? String(data.client_phone) : null,
    client_email: data.client_email ? String(data.client_email) : null,
    client_note: data.notes ? String(data.notes) : null,
    internal_note: null,
    service_id: appointmentServices[0]?.service_id ?? "",
    employee_id: data.employee_id ? String(data.employee_id) : "",
    room_id: data.room_id ? String(data.room_id) : "",
    appointment_services: appointmentServices,
  };
}
