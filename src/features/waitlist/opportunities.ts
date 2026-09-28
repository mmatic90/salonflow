import { createClient } from "@/lib/supabase/server";
import { getTodayLocalDate } from "@/lib/utils";
import { getSmartAvailability } from "@/features/availability/smart-availability";

type RawServiceRelation = {
  id: string;
  duration_minutes: number | null;
  is_active: boolean | null;
};

type WaitlistOpportunityRow = {
  id: string;
  service_id: string;
  preferred_employee_id: string | null;
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  preferred_time_from: string | null;
  preferred_time_to: string | null;
  status: string;
  matched_date?: string | null;
  matched_start_time?: string | null;
  service: RawServiceRelation | RawServiceRelation[] | null;
};

type FreedSlot = {
  organizationId: string;
  date: string;
  startTime: string;
  endTime: string;
  employeeId: string;
};

type OccupiedSlot = {
  organizationId: string;
  date: string;
  startTime: string;
  endTime: string;
  employeeId: string;
  roomId: string | null;
};

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

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

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return (
    timeToMinutes(aStart) < timeToMinutes(bEnd) &&
    timeToMinutes(bStart) < timeToMinutes(aEnd)
  );
}

function matchPayload(args: {
  date: string;
  startTime: string;
  endTime: string;
  employeeId: string;
  roomId: string;
}) {
  return {
    matched_date: args.date,
    matched_start_time: args.startTime,
    matched_end_time: args.endTime,
    matched_employee_id: args.employeeId,
    matched_room_id: args.roomId,
    matched_at: new Date().toISOString(),
  };
}

function clearMatchPayload() {
  return {
    matched_date: null,
    matched_start_time: null,
    matched_end_time: null,
    matched_employee_id: null,
    matched_room_id: null,
    matched_at: null,
  };
}

async function saveMatch(
  organizationId: string,
  entryId: string,
  payload: ReturnType<typeof matchPayload> | ReturnType<typeof clearMatchPayload>,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist_entries")
    .update(payload)
    .eq("organization_id", organizationId)
    .eq("id", entryId)
    .eq("status", "waiting");

  if (error) {
    console.error("Waitlist opportunity could not be saved:", error.message);
  }
}

async function getEntry(organizationId: string, entryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
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
      matched_date,
      matched_start_time,
      service:services (
        id,
        duration_minutes,
        is_active
      )
    `)
    .eq("organization_id", organizationId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    console.error("Waitlist entry could not be loaded for matching:", error.message);
    return null;
  }

  return data as unknown as WaitlistOpportunityRow | null;
}

export async function refreshWaitlistEntryOpportunity(
  organizationId: string,
  entryId: string,
) {
  const entry = await getEntry(organizationId, entryId);
  if (!entry || entry.status !== "waiting") return;

  const service = singleRelation(entry.service);
  const durationMinutes = Number(service?.duration_minutes ?? 0);
  if (!service?.is_active || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    await saveMatch(organizationId, entryId, clearMatchPayload());
    return;
  }

  const today = getTodayLocalDate();
  const startDate = entry.preferred_date_from
    ? maxDate(entry.preferred_date_from, today)
    : today;
  const latestSearchDate = addDays(startDate, 59);
  const endDate = entry.preferred_date_to
    ? minDate(entry.preferred_date_to, latestSearchDate)
    : addDays(startDate, 29);

  if (endDate < startDate) {
    await saveMatch(organizationId, entryId, clearMatchPayload());
    return;
  }

  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    try {
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
        maxSuggestions: 1,
      });

      const suggestion = result.suggestions[0];
      if (!suggestion) continue;

      await saveMatch(
        organizationId,
        entryId,
        matchPayload({
          date,
          startTime: suggestion.start_time,
          endTime: suggestion.end_time,
          employeeId: suggestion.employee_id,
          roomId: suggestion.room_id,
        }),
      );
      return;
    } catch (error) {
      console.error("Automatic waitlist matching failed:", error);
    }
  }

  await saveMatch(organizationId, entryId, clearMatchPayload());
}

export async function refreshWaitlistOpportunitiesForFreedSlot({
  organizationId,
  date,
  startTime,
  endTime,
  employeeId,
}: FreedSlot) {
  if (!date || !startTime || !endTime || !employeeId || date < getTodayLocalDate()) {
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
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
      matched_date,
      matched_start_time,
      service:services (
        id,
        duration_minutes,
        is_active
      )
    `)
    .eq("organization_id", organizationId)
    .eq("status", "waiting")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Waitlist could not be checked after a slot opened:", error.message);
    return;
  }

  const rows = (data ?? []) as unknown as WaitlistOpportunityRow[];
  const freedStart = timeToMinutes(startTime);
  const freedEnd = timeToMinutes(endTime);

  for (const entry of rows) {
    if (entry.preferred_date_from && date < entry.preferred_date_from) continue;
    if (entry.preferred_date_to && date > entry.preferred_date_to) continue;
    if (
      entry.preferred_employee_id &&
      entry.preferred_employee_id !== employeeId
    ) {
      continue;
    }

    if (
      entry.matched_date &&
      entry.matched_start_time &&
      `${entry.matched_date} ${entry.matched_start_time}` <= `${date} ${startTime}`
    ) {
      continue;
    }

    const service = singleRelation(entry.service);
    const durationMinutes = Number(service?.duration_minutes ?? 0);
    if (!service?.is_active || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      continue;
    }

    const preferredStart = entry.preferred_time_from
      ? Math.max(freedStart, timeToMinutes(entry.preferred_time_from))
      : freedStart;
    const preferredEnd = entry.preferred_time_to
      ? Math.min(freedEnd, timeToMinutes(entry.preferred_time_to))
      : freedEnd;

    if (preferredStart + durationMinutes > preferredEnd) continue;

    try {
      const result = await getSmartAvailability({
        date,
        items: [
          {
            service_id: entry.service_id,
            duration_minutes: durationMinutes,
          },
        ],
        preferredEmployeeId: employeeId,
        preferredTimeFrom: minutesToTime(preferredStart),
        preferredTimeTo: minutesToTime(preferredEnd),
        maxSuggestions: 1,
      });

      const suggestion = result.suggestions[0];
      if (!suggestion || suggestion.employee_id !== employeeId) continue;

      await saveMatch(
        organizationId,
        entry.id,
        matchPayload({
          date,
          startTime: suggestion.start_time,
          endTime: suggestion.end_time,
          employeeId: suggestion.employee_id,
          roomId: suggestion.room_id,
        }),
      );
    } catch (matchError) {
      console.error("Waitlist freed-slot matching failed:", matchError);
    }
  }
}

export async function refreshWaitlistOpportunitiesAfterOccupiedSlot({
  organizationId,
  date,
  startTime,
  endTime,
  employeeId,
  roomId,
}: OccupiedSlot) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waitlist_entries")
    .select(
      "id, matched_date, matched_start_time, matched_end_time, matched_employee_id, matched_room_id",
    )
    .eq("organization_id", organizationId)
    .eq("status", "waiting")
    .eq("matched_date", date)
    .not("matched_start_time", "is", null)
    .not("matched_end_time", "is", null);

  if (error) {
    console.error("Waitlist matches could not be invalidated:", error.message);
    return;
  }

  const affected = (data ?? []).filter((entry) => {
    if (!entry.matched_start_time || !entry.matched_end_time) return false;
    const sameResource =
      entry.matched_employee_id === employeeId ||
      Boolean(roomId && entry.matched_room_id === roomId);
    return (
      sameResource &&
      overlaps(
        entry.matched_start_time,
        entry.matched_end_time,
        startTime,
        endTime,
      )
    );
  });

  for (const entry of affected) {
    await saveMatch(organizationId, entry.id, clearMatchPayload());
    await refreshWaitlistEntryOpportunity(organizationId, entry.id);
  }
}

export async function clearWaitlistOpportunity(
  organizationId: string,
  entryId: string,
) {
  await saveMatch(organizationId, entryId, clearMatchPayload());
}
