import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import type {
  EmployeeListItem,
  EmployeeSchedulePageData,
  EmployeeUpcomingScheduleItem,
} from "./types";

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function dayLabelHr(date: Date) {
  return new Intl.DateTimeFormat("hr-HR", { weekday: "long" }).format(date);
}

function displayName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Zaposlenik";
}

function reasonToOverrideType(reason: string | null, isWorking: boolean) {
  if (isWorking) return "custom_hours" as const;
  if (reason === "vacation") return "vacation" as const;
  if (reason === "sick_leave") return "sick_leave" as const;
  return "day_off" as const;
}

function overrideReasonLabel(value: string, isWorking: boolean) {
  if (isWorking) return "Posebno radno vrijeme";
  if (value === "vacation") return "Godišnji";
  if (value === "sick_leave") return "Bolovanje";
  return "Slobodan dan";
}

export async function getEmployeesForSchedule(): Promise<EmployeeListItem[]> {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name, color")
    .eq("organization_id", permissions.organizationId)
    .eq("is_active", true)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (error) {
    console.error("getEmployeesForSchedule failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error("Nije moguće dohvatiti zaposlenike.");
  }

  return (data ?? []).map((employee) => ({
    id: String(employee.id),
    display_name: displayName(employee.first_name, employee.last_name),
    color_hex: employee.color ?? null,
  }));
}

export async function getEmployeeSchedulePageData(
  employeeId: string,
): Promise<EmployeeSchedulePageData | null> {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) return null;

  const supabase = await createClient();
  const organizationId = permissions.organizationId;

  const [employeeResult, defaultResult, overrideResult, salonHoursResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name, color")
      .eq("organization_id", organizationId)
      .eq("id", employeeId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("employee_default_schedule")
      .select("id, employee_id, day_of_week, start_time, end_time, is_working")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("employee_schedule_overrides")
      .select("id, employee_id, schedule_date, is_working, start_time, end_time, reason")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .order("schedule_date", { ascending: true }),
    supabase
      .from("salon_working_hours")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("organization_id", organizationId)
      .order("day_of_week", { ascending: true }),
  ]);

  if (employeeResult.error) {
    console.error("Schedule employee query failed", employeeResult.error);
    return null;
  }
  if (!employeeResult.data) return null;

  if (defaultResult.error) {
    console.error("Default schedule query failed", defaultResult.error);
    throw new Error("Nije moguće dohvatiti zadani raspored.");
  }
  if (overrideResult.error) {
    console.error("Schedule override query failed", overrideResult.error);
    throw new Error("Nije moguće dohvatiti iznimke rasporeda.");
  }
  if (salonHoursResult.error) {
    console.error("Salon hours query failed", salonHoursResult.error);
    throw new Error("Nije moguće dohvatiti radno vrijeme salona.");
  }

  const defaultRows = (defaultResult.data ?? []).map((row) => ({
    id: String(row.id),
    employee_id: String(row.employee_id),
    day_of_week: Number(row.day_of_week),
    start_time: row.start_time ?? "",
    end_time: row.end_time ?? "",
    is_working: Boolean(row.is_working),
  }));

  const overrideRows = (overrideResult.data ?? []).map((row) => {
    const overrideType = reasonToOverrideType(row.reason, Boolean(row.is_working));
    return {
      id: String(row.id),
      employee_id: String(row.employee_id),
      override_date: String(row.schedule_date),
      override_type: overrideType,
      start_time: row.start_time ?? null,
      end_time: row.end_time ?? null,
      note: row.reason && !["day_off", "vacation", "sick_leave"].includes(row.reason)
        ? row.reason
        : null,
    };
  });

  const salonHours = (salonHoursResult.data ?? []).map((row) => ({
    day_of_week: Number(row.day_of_week),
    opens_at: String(row.opens_at ?? "").slice(0, 5),
    closes_at: String(row.closes_at ?? "").slice(0, 5),
    is_closed: Boolean(row.is_closed),
  }));

  const upcomingSchedule: EmployeeUpcomingScheduleItem[] = Array.from(
    { length: 5 },
    (_, index) => {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      currentDate.setDate(currentDate.getDate() + index);
      const dateString = formatDateOnly(currentDate);
      const salonDay = salonHours.find(
        (row) => row.day_of_week === currentDate.getDay(),
      );

      if (!salonDay || salonDay.is_closed) {
        return {
          date: formatDateDisplay(currentDate),
          day_label: dayLabelHr(currentDate),
          is_working: false,
          start_time: null,
          end_time: null,
          status_label: "Salon zatvoren",
          reason_label: "Salon je zatvoren",
          is_override: false,
        };
      }

      const override = overrideRows.find((row) => row.override_date === dateString);

      if (override) {
        const isWorking = override.override_type === "custom_hours";
        return {
          date: formatDateDisplay(currentDate),
          day_label: dayLabelHr(currentDate),
          is_working: isWorking,
          start_time: isWorking ? override.start_time : null,
          end_time: isWorking ? override.end_time : null,
          status_label: isWorking ? "Radi" : "Ne radi",
          reason_label: override.note?.trim()
            ? override.note
            : overrideReasonLabel(override.override_type, isWorking),
          is_override: true,
        };
      }

      const defaultItem = defaultRows.find(
        (row) => row.day_of_week === currentDate.getDay(),
      );

      if (!defaultItem?.is_working) {
        return {
          date: formatDateDisplay(currentDate),
          day_label: dayLabelHr(currentDate),
          is_working: false,
          start_time: null,
          end_time: null,
          status_label: "Ne radi",
          reason_label: null,
          is_override: false,
        };
      }

      return {
        date: formatDateDisplay(currentDate),
        day_label: dayLabelHr(currentDate),
        is_working: true,
        start_time: defaultItem.start_time,
        end_time: defaultItem.end_time,
        status_label: "Radi",
        reason_label: null,
        is_override: false,
      };
    },
  );

  return {
    employee: {
      id: String(employeeResult.data.id),
      display_name: displayName(
        employeeResult.data.first_name,
        employeeResult.data.last_name,
      ),
      color_hex: employeeResult.data.color ?? null,
    },
    defaultSchedule: defaultRows,
    overrides: overrideRows,
    upcomingSchedule,
    salonHours,
  };
}
