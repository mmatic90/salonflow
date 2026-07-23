import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { getMultiTenantAppointmentById } from "@/features/appointments/multi-tenant-edit-query";
import MultiTenantEditAppointmentForm from "./multi-tenant-edit-form";


type Params = Promise<{
  id: string;
}>;

type ClientRow = Record<string, unknown> & { id: string };

function getClientName(client: ClientRow) {
  const fullName =
    typeof client.full_name === "string" ? client.full_name.trim() : "";
  if (fullName) return fullName;

  const firstName =
    typeof client.first_name === "string" ? client.first_name.trim() : "";
  const lastName =
    typeof client.last_name === "string" ? client.last_name.trim() : "";
  const combined = [firstName, lastName].filter(Boolean).join(" ");
  if (combined) return combined;

  const name = typeof client.name === "string" ? client.name.trim() : "";
  if (name) return name;

  return "Klijent";
}

export default async function EditAppointmentPage({
  params,
}: {
  params: Params;
}) {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    redirect("/login");
  }

  const { id } = await params;
  const appointment = await getMultiTenantAppointmentById(id);

  if (!appointment) {
    notFound();
  }

  const supabase = await createClient();
  const organizationId = permissions.organizationId;

  const [servicesResult, employeesResult, roomsResult, clientsResult] =
    await Promise.all([
      supabase
        .from("services")
        .select("id, name, duration_minutes, price, is_active")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("employees")
        .select("id, first_name, last_name, color, is_active")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("first_name", { ascending: true }),
      supabase
        .from("rooms")
        .select("id, name")
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
    servicesResult.error ||
    employeesResult.error ||
    roomsResult.error ||
    clientsResult.error;

  if (firstError) {
    throw new Error(firstError.message || "Nije moguće pripremiti uređivanje termina.");
  }

  const services = (servicesResult.data ?? []).map((service) => ({
    id: String(service.id),
    name: String(service.name),
    duration_minutes: Number(service.duration_minutes ?? 0),
    price_cents:
      service.price == null ? null : Math.round(Number(service.price) * 100),
    service_group: null,
    priority_room: null,
    is_active: service.is_active,
  }));

  const employees = (employeesResult.data ?? []).map((employee) => ({
    id: String(employee.id),
    display_name:
      [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
      "Zaposlenik",
    color_hex: employee.color ?? null,
  }));

  const rooms = (roomsResult.data ?? []).map((room) => ({
    id: String(room.id),
    name: String(room.name),
  }));

  const clients = ((clientsResult.data ?? []) as ClientRow[])
    .map((client) => ({
      id: String(client.id),
      full_name: getClientName(client),
      phone: typeof client.phone === "string" ? client.phone : null,
      email: typeof client.email === "string" ? client.email : null,
      note: typeof client.note === "string" ? client.note : null,
      internal_note:
        typeof client.internal_note === "string" ? client.internal_note : null,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "hr"));

  return (
    <main className="min-h-screen bg-app-bg p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-app-text">Uredi termin</h1>
              <p className="mt-2 text-app-muted">
                Uredi postojeći termin i njegove podatke.
              </p>
            </div>

            <Link
              href={`/dashboard/appointments?date=${appointment.appointment_date}`}
              className="inline-flex items-center justify-center rounded-xl border border-app-soft bg-white px-4 py-2 font-medium text-app-text transition hover:bg-app-bg"
            >
              Natrag na termine
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <MultiTenantEditAppointmentForm
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
