import { createClient } from "@/lib/supabase/server";

type RawClient = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type RawService = {
  id: string;
  name: string | null;
};

type RawEmployee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type RawRoom = {
  id: string;
  name: string | null;
};

type RawOpportunity = {
  id: string;
  client_id: string;
  service_id: string;
  matched_date: string | null;
  matched_start_time: string | null;
  matched_end_time: string | null;
  matched_employee_id: string | null;
  matched_room_id: string | null;
  matched_at: string | null;
  created_at: string;
  client: RawClient | RawClient[] | null;
  service: RawService | RawService[] | null;
  matched_employee: RawEmployee | RawEmployee[] | null;
  matched_room: RawRoom | RawRoom[] | null;
};

export type WaitlistOpportunityAlert = {
  entry_id: string;
  client_id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  service_id: string;
  service_name: string;
  date: string;
  start_time: string;
  end_time: string;
  employee_id: string;
  employee_name: string;
  room_id: string;
  room_name: string;
  matched_at: string | null;
  waitlist_created_at: string;
};

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function fullName(firstName: string | null, lastName: string | null, fallback: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
}

export async function getWaitlistOpportunityAlerts(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waitlist_entries")
    .select(`
      id,
      client_id,
      service_id,
      matched_date,
      matched_start_time,
      matched_end_time,
      matched_employee_id,
      matched_room_id,
      matched_at,
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
        name
      ),
      matched_employee:employees!waitlist_entries_matched_employee_id_fkey (
        id,
        first_name,
        last_name
      ),
      matched_room:rooms!waitlist_entries_matched_room_id_fkey (
        id,
        name
      )
    `)
    .eq("organization_id", organizationId)
    .eq("status", "waiting")
    .not("matched_date", "is", null)
    .not("matched_start_time", "is", null)
    .not("matched_end_time", "is", null)
    .not("matched_employee_id", "is", null)
    .not("matched_room_id", "is", null)
    .order("matched_date", { ascending: true })
    .order("matched_start_time", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Nije moguće dohvatiti prilike s liste čekanja.");
  }

  return ((data ?? []) as unknown as RawOpportunity[])
    .map((row): WaitlistOpportunityAlert | null => {
      if (
        !row.matched_date ||
        !row.matched_start_time ||
        !row.matched_end_time ||
        !row.matched_employee_id ||
        !row.matched_room_id
      ) {
        return null;
      }

      const client = singleRelation(row.client);
      const service = singleRelation(row.service);
      const employee = singleRelation(row.matched_employee);
      const room = singleRelation(row.matched_room);

      return {
        entry_id: row.id,
        client_id: row.client_id,
        client_name: client
          ? fullName(client.first_name, client.last_name, "Klijent")
          : "Klijent",
        client_phone: client?.phone ?? null,
        client_email: client?.email ?? null,
        service_id: row.service_id,
        service_name: service?.name ?? "Usluga",
        date: row.matched_date,
        start_time: row.matched_start_time,
        end_time: row.matched_end_time,
        employee_id: row.matched_employee_id,
        employee_name: employee
          ? fullName(employee.first_name, employee.last_name, "Djelatnik")
          : "Djelatnik",
        room_id: row.matched_room_id,
        room_name: room?.name ?? "Soba",
        matched_at: row.matched_at,
        waitlist_created_at: row.created_at,
      };
    })
    .filter((item): item is WaitlistOpportunityAlert => Boolean(item));
}
