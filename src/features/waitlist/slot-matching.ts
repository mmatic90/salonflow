import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { validateAppointmentRuntime } from "@/features/appointments/runtime-validation";

type RawClientRelation = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type RawWaitingEntry = {
  id: string;
  client_id: string;
  preferred_employee_id: string | null;
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  preferred_time_from: string | null;
  preferred_time_to: string | null;
  notes: string | null;
  created_at: string;
  client: RawClientRelation | RawClientRelation[] | null;
};

export type WaitlistSlotMatch = {
  entry_id: string;
  client_id: string;
  client_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  preferred_employee: boolean;
};

type SlotMatchInput = {
  date: string;
  startTime: string;
  serviceId: string;
  employeeId: string;
  roomId: string;
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function dayOfWeekForDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function clientName(client: RawClientRelation | null) {
  if (!client) return "Klijent";
  return (
    [client.first_name, client.last_name].filter(Boolean).join(" ").trim() ||
    client.email ||
    client.phone ||
    "Klijent"
  );
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.slice(0, 5));
}

export async function findWaitingClientsForSlot(input: SlotMatchInput) {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) {
    return {
      matches: [] as WaitlistSlotMatch[],
      error: "Niste prijavljeni ili nemate aktivan salon.",
    };
  }

  const date = input.date.trim();
  const startTime = input.startTime.slice(0, 5);
  const serviceId = input.serviceId.trim();
  const employeeId = input.employeeId.trim();
  const roomId = input.roomId.trim();

  if (
    !isValidDate(date) ||
    !isValidTime(startTime) ||
    !serviceId ||
    !employeeId ||
    !roomId
  ) {
    return {
      matches: [] as WaitlistSlotMatch[],
      error: "Datum, vrijeme, usluga, zaposlenik i soba su obavezni.",
    };
  }

  const supabase = await createClient();
  const organizationId = permissions.organizationId;
  const dayOfWeek = dayOfWeekForDate(date);

  const [
    serviceResult,
    employeeResult,
    roomResult,
    employeeMappingResult,
    roomMappingResult,
    salonHoursResult,
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, duration_minutes")
      .eq("organization_id", organizationId)
      .eq("id", serviceId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", employeeId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("rooms")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", roomId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("employee_services")
      .select("employee_id")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .eq("service_id", serviceId)
      .maybeSingle(),
    supabase
      .from("service_rooms")
      .select("room_id")
      .eq("organization_id", organizationId)
      .eq("service_id", serviceId)
      .eq("room_id", roomId)
      .maybeSingle(),
    supabase
      .from("salon_working_hours")
      .select("opens_at, closes_at, is_closed")
      .eq("organization_id", organizationId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle(),
  ]);

  const firstError =
    serviceResult.error ||
    employeeResult.error ||
    roomResult.error ||
    employeeMappingResult.error ||
    roomMappingResult.error ||
    salonHoursResult.error;

  if (firstError) {
    return { matches: [] as WaitlistSlotMatch[], error: firstError.message };
  }

  if (!serviceResult.data) {
    return { matches: [] as WaitlistSlotMatch[], error: "Usluga nije dostupna." };
  }
  if (!employeeResult.data || !employeeMappingResult.data) {
    return {
      matches: [] as WaitlistSlotMatch[],
      error: "Odabrani zaposlenik ne može raditi ovu uslugu.",
    };
  }
  if (!roomResult.data || !roomMappingResult.data) {
    return {
      matches: [] as WaitlistSlotMatch[],
      error: "Odabrana usluga ne može se izvoditi u ovoj sobi.",
    };
  }

  const salonDay = salonHoursResult.data;
  if (!salonDay || salonDay.is_closed) {
    return {
      matches: [] as WaitlistSlotMatch[],
      error: "Salon je zatvoren na odabrani datum.",
    };
  }

  const durationMinutes = Number(serviceResult.data.duration_minutes ?? 0);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;

  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0 ||
    endMinutes > 24 * 60
  ) {
    return {
      matches: [] as WaitlistSlotMatch[],
      error: "Usluga nema valjano trajanje.",
    };
  }

  const endTime = minutesToTime(endMinutes);
  if (
    startMinutes < timeToMinutes(String(salonDay.opens_at)) ||
    endMinutes > timeToMinutes(String(salonDay.closes_at))
  ) {
    return {
      matches: [] as WaitlistSlotMatch[],
      error: "Termin je izvan radnog vremena salona.",
    };
  }

  const runtimeValidation = await validateAppointmentRuntime({
    organizationId,
    appointmentDate: date,
    startTime,
    endTime,
    employeeId,
    roomId,
  });

  if (!runtimeValidation.ok) {
    return {
      matches: [] as WaitlistSlotMatch[],
      error: runtimeValidation.message,
    };
  }

  const { data, error } = await supabase
    .from("waitlist_entries")
    .select(`
      id,
      client_id,
      preferred_employee_id,
      preferred_date_from,
      preferred_date_to,
      preferred_time_from,
      preferred_time_to,
      notes,
      created_at,
      client:clients (
        id,
        first_name,
        last_name,
        phone,
        email
      )
    `)
    .eq("organization_id", organizationId)
    .eq("service_id", serviceId)
    .eq("status", "waiting")
    .order("created_at", { ascending: true });

  if (error) {
    return { matches: [] as WaitlistSlotMatch[], error: error.message };
  }

  const matches = ((data ?? []) as unknown as RawWaitingEntry[])
    .filter((entry) => {
      if (entry.preferred_date_from && date < entry.preferred_date_from) return false;
      if (entry.preferred_date_to && date > entry.preferred_date_to) return false;
      if (
        entry.preferred_employee_id &&
        entry.preferred_employee_id !== employeeId
      ) {
        return false;
      }

      if (entry.preferred_time_from && entry.preferred_time_to) {
        const preferredStart = timeToMinutes(entry.preferred_time_from);
        const preferredEnd = timeToMinutes(entry.preferred_time_to);
        if (startMinutes < preferredStart || endMinutes > preferredEnd) return false;
      }

      return true;
    })
    .slice(0, 20)
    .map((entry) => {
      const client = singleRelation(entry.client);
      return {
        entry_id: entry.id,
        client_id: entry.client_id,
        client_name: clientName(client),
        phone: client?.phone ?? null,
        email: client?.email ?? null,
        notes: entry.notes,
        created_at: entry.created_at,
        preferred_employee: entry.preferred_employee_id === employeeId,
      } satisfies WaitlistSlotMatch;
    });

  return { matches, error: "", endTime };
}
