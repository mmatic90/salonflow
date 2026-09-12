import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { getTodayLocalDate } from "@/lib/utils";
import { getSmartAvailability } from "@/features/availability/smart-availability";

export type WaitlistMatch = {
  date: string;
  start_time: string;
  end_time: string;
  employee_id: string;
  employee_name: string;
  room_id: string;
  room_name: string;
};

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function maxDate(a: string, b: string) {
  return a >= b ? a : b;
}

function minDate(a: string, b: string) {
  return a <= b ? a : b;
}

export async function findWaitlistMatches(entryId: string) {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) {
    return { matches: [] as WaitlistMatch[], error: "Niste prijavljeni." };
  }

  const supabase = await createClient();
  const { data: entry, error } = await supabase
    .from("waitlist_entries")
    .select(`
      id,
      service_id,
      preferred_employee_id,
      preferred_date_from,
      preferred_date_to,
      preferred_time_from,
      preferred_time_to,
      status,
      service:services (
        id,
        duration_minutes,
        is_active
      )
    `)
    .eq("organization_id", permissions.organizationId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    return { matches: [] as WaitlistMatch[], error: error.message };
  }

  if (!entry || entry.status !== "waiting") {
    return {
      matches: [] as WaitlistMatch[],
      error: "Zapis više nije aktivan na listi čekanja.",
    };
  }

  const service = Array.isArray(entry.service)
    ? entry.service[0] ?? null
    : entry.service ?? null;

  if (!service || !service.is_active) {
    return {
      matches: [] as WaitlistMatch[],
      error: "Odabrana usluga više nije aktivna.",
    };
  }

  const durationMinutes = Number(service.duration_minutes ?? 0);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return {
      matches: [] as WaitlistMatch[],
      error: "Usluga nema valjano trajanje.",
    };
  }

  const today = getTodayLocalDate();
  const requestedStart = entry.preferred_date_from
    ? maxDate(entry.preferred_date_from, today)
    : today;
  const defaultEnd = addDays(requestedStart, 13);
  const requestedEnd = entry.preferred_date_to
    ? minDate(entry.preferred_date_to, addDays(requestedStart, 29))
    : defaultEnd;

  if (requestedEnd < requestedStart) {
    return { matches: [] as WaitlistMatch[], error: "Željeni raspon datuma je istekao." };
  }

  const matches: WaitlistMatch[] = [];

  for (let date = requestedStart; date <= requestedEnd; date = addDays(date, 1)) {
    const result = await getSmartAvailability({
      date,
      items: [
        {
          service_id: entry.service_id,
          duration_minutes: durationMinutes,
        },
      ],
      preferredEmployeeId: entry.preferred_employee_id ?? undefined,
      preferredTimeFrom: entry.preferred_time_from ?? undefined,
      preferredTimeTo: entry.preferred_time_to ?? undefined,
      maxSuggestions: Math.max(1, 3 - matches.length),
    });

    for (const suggestion of result.suggestions) {
      matches.push({ date, ...suggestion });
      if (matches.length >= 3) break;
    }

    if (matches.length >= 3) break;
  }

  return { matches, error: "" };
}
