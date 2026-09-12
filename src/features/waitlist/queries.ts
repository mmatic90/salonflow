import { createClient } from "@/lib/supabase/server";

type WaitlistStatus = "waiting" | "booked" | "cancelled";

type RawClientRelation = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type RawServiceRelation = {
  id: string;
  name: string | null;
  duration_minutes: number | null;
};

type RawEmployeeRelation = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type RawWaitlistEntry = {
  id: string;
  client_id: string;
  service_id: string;
  preferred_employee_id: string | null;
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  preferred_time_from: string | null;
  preferred_time_to: string | null;
  notes: string | null;
  status: WaitlistStatus;
  booked_appointment_id: string | null;
  created_at: string;
  client: RawClientRelation | RawClientRelation[] | null;
  service: RawServiceRelation | RawServiceRelation[] | null;
  preferred_employee: RawEmployeeRelation | RawEmployeeRelation[] | null;
};

export type WaitlistEntry = {
  id: string;
  client_id: string;
  service_id: string;
  preferred_employee_id: string | null;
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  preferred_time_from: string | null;
  preferred_time_to: string | null;
  notes: string | null;
  status: WaitlistStatus;
  booked_appointment_id: string | null;
  created_at: string;
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  service: {
    id: string;
    name: string;
    duration_minutes: number;
  } | null;
  preferred_employee: {
    id: string;
    name: string;
  } | null;
};

export type WaitlistOption = {
  id: string;
  label: string;
};

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Klijent";
}

export async function getWaitlistPageData(organizationId: string) {
  const supabase = await createClient();

  const [entriesResult, clientsResult, servicesResult, employeesResult] =
    await Promise.all([
      supabase
        .from("waitlist_entries")
        .select(`
          id,
          client_id,
          service_id,
          preferred_employee_id,
          preferred_date_from,
          preferred_date_to,
          preferred_time_from,
          preferred_time_to,
          notes,
          status,
          booked_appointment_id,
          created_at,
          client:clients (
            id,
            first_name,
            last_name,
            phone,
            email
          ),
          service:services (
            id,
            name,
            duration_minutes
          ),
          preferred_employee:employees (
            id,
            first_name,
            last_name
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true }),
      supabase
        .from("services")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true }),
    ]);

  const firstError =
    entriesResult.error ||
    clientsResult.error ||
    servicesResult.error ||
    employeesResult.error;

  if (firstError) {
    throw new Error(firstError.message || "Nije moguće dohvatiti listu čekanja.");
  }

  const entries: WaitlistEntry[] = (
    (entriesResult.data ?? []) as unknown as RawWaitlistEntry[]
  ).map((row) => {
    const client = singleRelation(row.client);
    const service = singleRelation(row.service);
    const employee = singleRelation(row.preferred_employee);

    return {
      id: row.id,
      client_id: row.client_id,
      service_id: row.service_id,
      preferred_employee_id: row.preferred_employee_id,
      preferred_date_from: row.preferred_date_from,
      preferred_date_to: row.preferred_date_to,
      preferred_time_from: row.preferred_time_from,
      preferred_time_to: row.preferred_time_to,
      notes: row.notes,
      status: row.status,
      booked_appointment_id: row.booked_appointment_id,
      created_at: row.created_at,
      client: client
        ? {
            id: client.id,
            name: fullName(client.first_name, client.last_name),
            phone: client.phone,
            email: client.email,
          }
        : null,
      service: service
        ? {
            id: service.id,
            name: service.name ?? "Usluga",
            duration_minutes: Number(service.duration_minutes ?? 0),
          }
        : null,
      preferred_employee: employee
        ? {
            id: employee.id,
            name: fullName(employee.first_name, employee.last_name),
          }
        : null,
    };
  });

  const clients: WaitlistOption[] = (clientsResult.data ?? []).map((client) => ({
    id: String(client.id),
    label: fullName(client.first_name, client.last_name),
  }));

  const services: WaitlistOption[] = (servicesResult.data ?? []).map((service) => ({
    id: String(service.id),
    label: String(service.name ?? "Usluga"),
  }));

  const employees: WaitlistOption[] = (employeesResult.data ?? []).map((employee) => ({
    id: String(employee.id),
    label: fullName(employee.first_name, employee.last_name),
  }));

  return { entries, clients, services, employees };
}

export async function getWaitingWaitlistCount(organizationId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("waitlist_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "waiting");

  if (error) return 0;
  return count ?? 0;
}
