import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

type OverrideType = "custom_hours" | "day_off" | "vacation" | "sick_leave";

type DefaultScheduleRow = {
  employee_id: string;
  day_of_week: number;
  is_working: boolean;
};

type OverrideRow = {
  employee_id: string;
  override_date: string;
  override_type: OverrideType;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date")?.trim() ?? "";

  if (!isIsoDate(date)) {
    return NextResponse.json(
      { error: "Date query param mora biti valjan datum u formatu YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const permissions = await getCurrentUserPermissions();
  if (!permissions) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const supabase = await createClient();
  const organizationId = permissions.organizationId;
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();

  const [
    { data: employees, error: employeesError },
    { data: defaultSchedules, error: defaultSchedulesError },
    { data: overrides, error: overridesError },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("employee_default_schedule")
      .select("employee_id, day_of_week, is_working")
      .eq("organization_id", organizationId)
      .eq("day_of_week", dayOfWeek),
    supabase
      .from("employee_schedule_overrides")
      .select("employee_id, override_date, override_type")
      .eq("organization_id", organizationId)
      .eq("override_date", date),
  ]);

  if (employeesError || defaultSchedulesError || overridesError) {
    console.error("Employee availability lookup failed:", {
      employeesError,
      defaultSchedulesError,
      overridesError,
      organizationId,
      date,
    });

    return NextResponse.json(
      { error: "Greška pri dohvaćanju dostupnosti zaposlenika." },
      { status: 500 },
    );
  }

  const employeeIds = (employees ?? []).map((employee) => employee.id);
  const defaultRows = (defaultSchedules ?? []) as DefaultScheduleRow[];
  const overrideRows = (overrides ?? []) as OverrideRow[];

  const workingEmployeeIds = employeeIds.filter((employeeId) => {
    const override = overrideRows.find((row) => row.employee_id === employeeId);

    if (override) {
      return override.override_type === "custom_hours";
    }

    const defaultSchedule = defaultRows.find(
      (row) => row.employee_id === employeeId,
    );

    return defaultSchedule?.is_working === true;
  });

  return NextResponse.json({ workingEmployeeIds });
}
