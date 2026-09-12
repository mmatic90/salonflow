import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import MultiTenantEditAppointmentForm from "./multi-tenant-edit-form";
import type { AppointmentEditItem } from "@/features/appointments/queries";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Params = Promise<{ id: string }>;
type GenericRow = Record<string, unknown> & { id: string };

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getClientName(client: GenericRow) {
  const fullName = asString(client.full_name).trim();
  if (fullName) return fullName;

  const combined = [asString(client.first_name), asString(client.last_name)]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  return combined || asString(client.name).trim() || "Klijent";
}

function durationBetween(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = endTime.slice(0, 5).split(":").map(Number);

  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return 0;
  return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute));
}

function ErrorCard({
  message,
  id,
  locale,
}: {
  message: string;
  id: string;
  locale: AppLocale;
}) {
  const t = getDictionary(locale).appointments;
  return (
    <main className="min-h-screen bg-app-bg p-6 md:p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h1 className="text-2xl font-bold">{t.cannotOpenTitle}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm">{message}</p>
        <p className="mt-3 text-xs text-red-700">{t.appointmentId}: {id}</p>
        <Link
          href="/dashboard/appointments"
          className="mt-5 inline-flex rounded-xl border border-red-300 bg-white px-4 py-2 font-medium"
        >
          {t.backToAppointments}
        </Link>
      </div>
    </main>
  );
}

export default async function EditAppointmentPage({ params }: { params: Params }) {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) redirect("/login");

  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.appointments;
  const { id } = await params;
  const supabase = await createClient();
  const organizationId = permissions.organizationId;

  const appointmentResult = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (appointmentResult.error) {
    return <ErrorCard id={id} locale={permissions.organizationLocale} message={t.fetchAppointment + ": " + appointmentResult.error.message} />;
  }

  if (!appointmentResult.data) {
    return <ErrorCard id={id} locale={permissions.organizationLocale} message={t.notFoundInSalon} />;
  }

  const [appointmentServicesResult, servicesResult, employeesResult, roomsResult, clientsResult] =
    await Promise.all([
      supabase
        .from("appointment_services")
        .select("*")
        .eq("appointment_id", id)
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("employees")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true),
      supabase
        .from("rooms")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true),
    ]);

  const firstError =
    appointmentServicesResult.error ||
    servicesResult.error ||
    employeesResult.error ||
    roomsResult.error ||
    clientsResult.error;

  if (firstError) {
    return <ErrorCard id={id} locale={permissions.organizationLocale} message={t.prepareForm + ": " + firstError.message} />;
  }

  const rawAppointment = appointmentResult.data as GenericRow;
  const rawAppointmentServices = (appointmentServicesResult.data ?? []) as GenericRow[];

  const appointmentServices = rawAppointmentServices.map((entry, index) => ({
    id: String(entry.id),
    appointment_id: id,
    service_id: asString(entry.service_id),
    duration_minutes: Number(entry.duration_minutes ?? 0),
    sort_order: Number(entry.sort_order ?? index),
    service: {
      id: asString(entry.service_id),
      name: asString(entry.service_name) || t.service,
      description: null,
      service_group: null,
    },
  }));

  const startTime = asString(rawAppointment.start_time);
  const endTime = asString(rawAppointment.end_time);

  const appointment: AppointmentEditItem = {
    id,
    client_id: nullableString(rawAppointment.client_id),
    appointment_date: asString(rawAppointment.appointment_date),
    start_time: startTime,
    end_time: endTime,
    duration_minutes: durationBetween(startTime, endTime),
    status: asString(rawAppointment.status) as AppointmentEditItem["status"],
    client_name: asString(rawAppointment.client_name),
    client_phone: nullableString(rawAppointment.client_phone),
    client_email: nullableString(rawAppointment.client_email),
    client_note: nullableString(rawAppointment.notes),
    internal_note: null,
    service_id: appointmentServices[0]?.service_id || asString(rawAppointment.service_id),
    employee_id: asString(rawAppointment.employee_id),
    room_id: asString(rawAppointment.room_id),
    appointment_services: appointmentServices,
  };

  const services = ((servicesResult.data ?? []) as GenericRow[]).map((service) => ({
    id: String(service.id),
    name: asString(service.name),
    duration_minutes: Number(service.duration_minutes ?? 0),
    price_cents: service.price == null ? null : Math.round(Number(service.price) * 100),
    service_group: nullableString(service.service_group),
    priority_room: nullableString(service.priority_room),
    is_active: Boolean(service.is_active),
  }));

  const employees = ((employeesResult.data ?? []) as GenericRow[]).map((employee) => ({
    id: String(employee.id),
    display_name:
      [asString(employee.first_name), asString(employee.last_name)]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" ") || asString(employee.display_name) || t.genericEmployee,
    color_hex: nullableString(employee.color) ?? nullableString(employee.color_hex),
  }));

  const rooms = ((roomsResult.data ?? []) as GenericRow[]).map((room) => ({
    id: String(room.id),
    name: asString(room.name),
  }));

  const clients = ((clientsResult.data ?? []) as GenericRow[])
    .map((client) => ({
      id: String(client.id),
      full_name: getClientName(client),
      phone: nullableString(client.phone),
      email: nullableString(client.email),
      note: nullableString(client.note),
      internal_note: nullableString(client.internal_note),
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "hr"));

  return (
    <main className="min-h-screen bg-app-bg p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-app-text">{t.editTitle}</h1>
              <p className="mt-2 text-app-muted">{t.editSubtitle}</p>
            </div>
            <Link
              href={`/dashboard/appointments?date=${appointment.appointment_date}`}
              className="inline-flex items-center justify-center rounded-xl border border-app-soft bg-white px-4 py-2 font-medium text-app-text transition hover:bg-app-bg"
            >
              {t.backToAppointments}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <MultiTenantEditAppointmentForm
            locale={permissions.organizationLocale}
            appointment={appointment}
            services={services}
            employees={employees}
            rooms={rooms}
            clients={clients}
          />
        </div>
      </div>
    </main>
  );
}
