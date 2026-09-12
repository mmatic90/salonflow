"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

export type ScheduleActionState = {
  error: string;
  success: string;
};

function buildSchedulePath(employeeId: string) {
  return `/dashboard/schedule/${employeeId}`;
}

function parseDayNumber(value: FormDataEntryValue | null) {
  const num = Number(value);
  return Number.isInteger(num) ? num : -1;
}

function buildDateRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const dates: string[] = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return dates;
  }

  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function isValidTimeRange(startTime: string, endTime: string) {
  return Boolean(startTime && endTime && endTime > startTime);
}

async function getSalonHoursByDay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("salon_working_hours")
    .select("day_of_week, opens_at, closes_at, is_closed")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((row) => [
      Number(row.day_of_week),
      {
        opens_at: String(row.opens_at).slice(0, 5),
        closes_at: String(row.closes_at).slice(0, 5),
        is_closed: Boolean(row.is_closed),
      },
    ]),
  );
}

function validateEmployeeHoursAgainstSalon(args: {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  salonHours: Map<
    number,
    { opens_at: string; closes_at: string; is_closed: boolean }
  >;
}) {
  if (!args.isWorking) return null;

  const salonDay = args.salonHours.get(args.dayOfWeek);

  if (!salonDay || salonDay.is_closed) {
    return "Zaposlenik ne može raditi dan kada je salon zatvoren.";
  }

  if (
    !args.startTime ||
    !args.endTime ||
    args.startTime < salonDay.opens_at ||
    args.endTime > salonDay.closes_at
  ) {
    return `Radno vrijeme zaposlenika mora biti unutar radnog vremena salona (${salonDay.opens_at}–${salonDay.closes_at}).`;
  }

  return null;
}

async function getScheduleContext(employeeId: string) {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) {
    return { ok: false as const, error: "Niste prijavljeni ili nemate aktivan salon." };
  }

  const canManage = ["owner", "admin", "manager"].includes(
    permissions.organizationRole,
  );
  if (!canManage) {
    return { ok: false as const, error: "Nemate ovlasti za upravljanje rasporedima." };
  }

  const supabase = await createClient();
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", permissions.organizationId)
    .eq("id", employeeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !employee) {
    return { ok: false as const, error: error?.message || "Zaposlenik nije pronađen." };
  }

  return {
    ok: true as const,
    organizationId: permissions.organizationId,
    supabase,
  };
}

function refreshSchedule(employeeId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/schedule");
  revalidatePath(buildSchedulePath(employeeId));
  revalidatePath("/dashboard/appointments/new");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/time-grid");
}

export async function updateDefaultScheduleAction(
  employeeId: string,
  _prevState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const context = await getScheduleContext(employeeId);
  if (!context.ok) return { error: context.error, success: "" };

  const updates = Array.from({ length: 7 }, (_, day) => {
    const isWorking = formData.get(`is_working_${day}`) === "on";
    const startTime = String(formData.get(`start_time_${day}`) ?? "");
    const endTime = String(formData.get(`end_time_${day}`) ?? "");

    return {
      organization_id: context.organizationId,
      employee_id: employeeId,
      day_of_week: day,
      is_working: isWorking,
      start_time: isWorking ? startTime : null,
      end_time: isWorking ? endTime : null,
    };
  });

  const invalid = updates.find(
    (item) => item.is_working && !isValidTimeRange(item.start_time ?? "", item.end_time ?? ""),
  );
  if (invalid) {
    return {
      error: `Za dan ${invalid.day_of_week} upiši valjano vrijeme početka i završetka rada.`,
      success: "",
    };
  }

  const salonHours = await getSalonHoursByDay(
    context.supabase,
    context.organizationId,
  );

  for (const item of updates) {
    const validationError = validateEmployeeHoursAgainstSalon({
      dayOfWeek: item.day_of_week,
      isWorking: item.is_working,
      startTime: item.start_time,
      endTime: item.end_time,
      salonHours,
    });

    if (validationError) {
      return { error: validationError, success: "" };
    }
  }

  const { error } = await context.supabase
    .from("employee_default_schedule")
    .upsert(updates, { onConflict: "employee_id,day_of_week" });

  if (error) return { error: error.message, success: "" };

  refreshSchedule(employeeId);
  return { error: "", success: "Zadani raspored je uspješno spremljen." };
}

export async function applyDefaultScheduleRangeAction(
  employeeId: string,
  _prevState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const context = await getScheduleContext(employeeId);
  if (!context.ok) return { error: context.error, success: "" };

  const dayFrom = parseDayNumber(formData.get("day_from"));
  const dayTo = parseDayNumber(formData.get("day_to"));
  const isWorking = formData.get("range_is_working") === "on";
  const startTime = String(formData.get("range_start_time") ?? "");
  const endTime = String(formData.get("range_end_time") ?? "");

  if (dayFrom < 0 || dayFrom > 6 || dayTo < 0 || dayTo > 6 || dayFrom > dayTo) {
    return { error: "Odaberi valjani raspon dana.", success: "" };
  }

  if (isWorking && !isValidTimeRange(startTime, endTime)) {
    return { error: "Za radne dane upiši valjano vrijeme početka i završetka.", success: "" };
  }

  const updates = Array.from({ length: dayTo - dayFrom + 1 }, (_, index) => ({
    organization_id: context.organizationId,
    employee_id: employeeId,
    day_of_week: dayFrom + index,
    is_working: isWorking,
    start_time: isWorking ? startTime : null,
    end_time: isWorking ? endTime : null,
  }));

  const salonHours = await getSalonHoursByDay(
    context.supabase,
    context.organizationId,
  );

  for (const item of updates) {
    const validationError = validateEmployeeHoursAgainstSalon({
      dayOfWeek: item.day_of_week,
      isWorking: item.is_working,
      startTime: item.start_time,
      endTime: item.end_time,
      salonHours,
    });

    if (validationError) {
      return { error: validationError, success: "" };
    }
  }

  const { error } = await context.supabase
    .from("employee_default_schedule")
    .upsert(updates, { onConflict: "employee_id,day_of_week" });

  if (error) return { error: error.message, success: "" };

  refreshSchedule(employeeId);
  return { error: "", success: "Raspored za odabrani raspon dana je spremljen." };
}

export async function createScheduleOverrideAction(
  employeeId: string,
  _prevState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const context = await getScheduleContext(employeeId);
  if (!context.ok) return { error: context.error, success: "" };

  const dateFrom = String(formData.get("date_from") ?? "");
  const dateTo = String(formData.get("date_to") ?? "");
  const overrideType = String(formData.get("override_type") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!dateFrom || !dateTo) {
    return { error: "Početni i završni datum su obavezni.", success: "" };
  }

  if (!["custom_hours", "day_off", "vacation", "sick_leave"].includes(overrideType)) {
    return { error: "Tip iznimke nije valjan.", success: "" };
  }

  const isWorking = overrideType === "custom_hours";
  if (isWorking && !isValidTimeRange(startTime, endTime)) {
    return { error: "Za posebno radno vrijeme upiši valjan početak i završetak.", success: "" };
  }

  const dates = buildDateRange(dateFrom, dateTo);
  if (dates.length === 0) {
    return { error: "Raspon datuma nije valjan.", success: "" };
  }

  const salonHours = await getSalonHoursByDay(
    context.supabase,
    context.organizationId,
  );

  if (isWorking) {
    for (const date of dates) {
      const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
      const validationError = validateEmployeeHoursAgainstSalon({
        dayOfWeek,
        isWorking: true,
        startTime,
        endTime,
        salonHours,
      });

      if (validationError) {
        return { error: validationError, success: "" };
      }
    }
  }

  const reason = isWorking ? note || "custom_hours" : note || overrideType;
  const payload = dates.map((date) => ({
    organization_id: context.organizationId,
    employee_id: employeeId,
    schedule_date: date,
    is_working: isWorking,
    start_time: isWorking ? startTime : null,
    end_time: isWorking ? endTime : null,
    reason,
  }));

  const { error } = await context.supabase
    .from("employee_schedule_overrides")
    .upsert(payload, { onConflict: "employee_id,schedule_date" });

  if (error) return { error: error.message, success: "" };

  refreshSchedule(employeeId);
  return { error: "", success: "Iznimka rasporeda je uspješno spremljena." };
}

export async function deleteScheduleOverrideAction(
  employeeId: string,
  overrideId: string,
) {
  const context = await getScheduleContext(employeeId);
  if (!context.ok) throw new Error(context.error);

  const { error } = await context.supabase
    .from("employee_schedule_overrides")
    .delete()
    .eq("organization_id", context.organizationId)
    .eq("employee_id", employeeId)
    .eq("id", overrideId);

  if (error) throw new Error(error.message);
  refreshSchedule(employeeId);
}
