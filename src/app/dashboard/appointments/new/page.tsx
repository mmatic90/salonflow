import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayLocalDate } from "@/lib/utils";
import { getCurrentUserPermissions } from "@/lib/permissions";
import MultiTenantAppointmentForm from "./multi-tenant-appointment-form";
import { getDictionary } from "@/lib/i18n";

type SearchParams = Promise<{
  date?: string;
  clientId?: string;
  serviceId?: string;
}>;

type ClientRow = Record<string, unknown> & {
  id: string;
};

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getClientLabel(client: ClientRow) {
  const fullName = typeof client.full_name === "string" ? client.full_name.trim() : "";
  if (fullName) return fullName;

  const name = typeof client.name === "string" ? client.name.trim() : "";
  if (name) return name;

  const clientName =
    typeof client.client_name === "string" ? client.client_name.trim() : "";
  if (clientName) return clientName;

  const firstName =
    typeof client.first_name === "string" ? client.first_name.trim() : "";
  const lastName =
    typeof client.last_name === "string" ? client.last_name.trim() : "";
  const combinedName = [firstName, lastName].filter(Boolean).join(" ");
  if (combinedName) return combinedName;

  const email = typeof client.email === "string" ? client.email.trim() : "";
  if (email) return email;

  const phone = typeof client.phone === "string" ? client.phone.trim() : "";
  if (phone) return phone;

  return "Klijent";
}

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    redirect("/login");
  }

  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.appointments;
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
    throw new Error(firstError.message || t.formPreparationError);
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
      t.genericEmployee,
  }));

  const rooms = (roomsResult.data ?? []).map((room) => ({
    id: room.id,
    label: room.name,
  }));

  const clients = ((clientsResult.data ?? []) as ClientRow[])
    .map((client) => ({
      id: client.id,
      label: getClientLabel(client),
      phone: asOptionalString(client.phone),
      email: asOptionalString(client.email),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "hr"));

  return (
    <main className="min-h-screen bg-app-bg p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-app-text">{t.newTitle}</h1>
              <p className="mt-2 text-app-muted">
                {t.newSubtitlePrefix} {permissions.organizationName}.
              </p>
            </div>

            <Link
              href={`/dashboard/calendar?date=${defaultDate}`}
              className="inline-flex items-center justify-center rounded-xl border border-app-soft bg-white px-4 py-2 font-medium text-app-text transition hover:bg-app-bg"
            >
              {dictionary.nav.calendar}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <MultiTenantAppointmentForm
            locale={permissions.organizationLocale}
            services={services}
            employees={employees}
            rooms={rooms}
            clients={clients}
            defaultDate={defaultDate}
            defaultClientId={resolvedSearchParams.clientId}
            defaultServiceId={resolvedSearchParams.serviceId}
          />
        </div>
      </div>
    </main>
  );
}
