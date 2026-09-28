"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

export type CreateAppointmentState = {
  error: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function addMinutes(startTime: string, minutes: number) {
  const [hours, mins] = startTime.slice(0, 5).split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const nextHours = Math.floor(total / 60) % 24;
  const nextMinutes = total % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

export async function createMultiTenantAppointmentAction(
  _previousState: CreateAppointmentState,
  formData: FormData,
): Promise<CreateAppointmentState> {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return { error: "Niste prijavljeni ili nemate aktivan salon." };
  }

  const organizationId = permissions.organizationId;
  const appointmentDate = text(formData, "appointment_date");
  const startTime = text(formData, "start_time");
  const clientName = text(formData, "client_name");
  const clientPhone = text(formData, "client_phone") || null;
  const clientEmail = text(formData, "client_email") || null;
  const clientIdInput = text(formData, "client_id");
  const employeeId = text(formData, "employee_id");
  const roomId = text(formData, "room_id") || null;
  const serviceId = text(formData, "service_id");
  const notes = text(formData, "notes") || null;

  if (!appointmentDate || !startTime || !clientName || !employeeId || !serviceId) {
    return { error: "Datum, vrijeme, klijent, zaposlenik i usluga su obavezni." };
  }

  const supabase = await createClient();

  const [{ data: employee }, { data: service }] = await Promise.all([
    supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price")
      .eq("id", serviceId)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (!employee) return { error: "Odabrani zaposlenik nije dostupan u ovom salonu." };
  if (!service) return { error: "Odabrana usluga nije dostupna u ovom salonu." };

  if (roomId) {
    const { data: room } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .maybeSingle();

    if (!room) return { error: "Odabrana soba nije dostupna u ovom salonu." };
  }

  const durationMinutes = Number(service.duration_minutes ?? 0);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { error: "Odabrana usluga nema valjano trajanje." };
  }

  let clientId: string | null = null;

  if (clientIdInput) {
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientIdInput)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!existingClient) return { error: "Odabrani klijent ne pripada ovom salonu." };
    clientId = existingClient.id;
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        organization_id: organizationId,
        full_name: clientName,
        phone: clientPhone,
        email: clientEmail,
        is_active: true,
      })
      .select("id")
      .single();

    if (clientError || !newClient) {
      return { error: clientError?.message || "Klijenta nije moguće spremiti." };
    }

    clientId = newClient.id;
  }

  const endTime = addMinutes(startTime, durationMinutes);
  const parsedPrice = service.price == null ? null : Number(service.price);
  const price =
    typeof parsedPrice === "number" && Number.isFinite(parsedPrice)
      ? parsedPrice
      : null;

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      organization_id: organizationId,
      client_id: clientId,
      employee_id: employeeId,
      room_id: roomId,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
      status: "scheduled",
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      notes,
      total_price: price,
      created_by: permissions.userId,
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    return { error: appointmentError?.message || "Termin nije moguće spremiti." };
  }

  const { error: serviceError } = await supabase.from("appointment_services").insert({
    organization_id: organizationId,
    appointment_id: appointment.id,
    service_id: service.id,
    service_name: service.name,
    duration_minutes: durationMinutes,
    price,
    sort_order: 0,
  });

  if (serviceError) {
    await supabase.from("appointments").delete().eq("id", appointment.id);
    return { error: serviceError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/calendar");
  redirect(`/dashboard/appointments?date=${appointmentDate}`);
}
