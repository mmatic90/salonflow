import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayLocalDate } from "@/lib/utils";
import { getCurrentUserPermissions } from "@/lib/permissions";
import MultiTenantAppointmentForm from "./multi-tenant-appointment-form";

type SearchParams = Promise<{
  date?: string;
}>;

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    redirect("/login");
  }

  const supabase = await createClient();
  const organizationId = permissions.organizationId;

  const [servicesResult, employeesResult, roomsResult, clientsResult] =
    await Promise.all([
      supabase
        .from("services")
        .select("id, name, duration_minutes")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("employees")
        .select("id, first_name, last_name")
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
        .select("id, full_name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("full_name", { ascending: true }),
    ]);

  const firstError =
    servicesResult.error ||
    employeesResult.error ||
    roomsResult.error ||
    clientsResult.error;

  if (firstError) {
    throw new Error(firstError.message || "Nije moguće pripremiti formu termina.");
  }

  const resolvedSearchParams = await searchParams;
  const defaultDate = resolvedSearchParams.date || getTodayLocalDate();

  const services = (servicesResult.data ?? []).map((service) => ({
    id: service.id,
    label: service.name,
    durationMinutes: Number(service.duration_minutes ?? 0),
  }));

  const employees = (employeesResult.data ?? []).map((employee) => ({
    id: employee.id,
    label:
      [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
      "Zaposlenik",
  }));

  const rooms = (roomsResult.data ?? []).map((room) => ({
    id: room.id,
    label: room.name,
  }));

  const clients = (clientsResult.data ?? []).map((client) => ({
    id: client.id,
    label: client.full_name,
  }));

  return (
    <main className="min-h-screen bg-app-bg p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-app-text">Novi termin</h1>
              <p className="mt-2 text-app-muted">
                Dodajte termin za salon {permissions.organizationName}.
              </p>
            </div>

            <Link
              href={`/dashboard/appointments?date=${defaultDate}`}
              className="inline-flex items-center justify-center rounded-xl border border-app-soft bg-white px-4 py-2 font-medium text-app-text transition hover:bg-app-bg"
            >
              Natrag na termine
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <MultiTenantAppointmentForm
            services={services}
            employees={employees}
            rooms={rooms}
            clients={clients}
            defaultDate={defaultDate}
          />
        </div>
      </div>
    </main>
  );
}
