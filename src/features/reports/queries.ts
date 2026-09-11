import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type AppointmentRow = {
  id: string;
  appointment_date: string;
  status: AppointmentStatus;
  employee_id: string | null;
  employee: { id: string; display_name: string } | null;
  services: { id: string; name: string }[];
};

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeek(date: Date) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function safeRate(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export async function getReportsDashboardData() {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");

  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = formatDate(today);
  const weekStartStr = formatDate(startOfWeek(today));
  const weekEndStr = formatDate(endOfWeek(today));
  const monthStartStr = formatDate(startOfMonth(today));
  const monthEndStr = formatDate(endOfMonth(today));
  const last14Start = new Date(today);
  last14Start.setDate(today.getDate() - 13);
  const last14StartStr = formatDate(last14Start);

  const monthStartIso = startOfMonth(today).toISOString();
  const nextMonthStartIso = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString();

  const [
    { data: appointmentData, error: appointmentError },
    { data: onlineBookingData, error: onlineBookingError },
  ] = await Promise.all([
    supabase
    .from("appointments")
    .select(`
      id,
      appointment_date,
      status,
      employee_id,
      employee:employees (
        id,
        first_name,
        last_name
      ),
      appointment_services (
        service_id,
        service_name,
        sort_order
      )
    `)
    .eq("organization_id", permissions.organizationId)
    .gte("appointment_date", last14StartStr)
    .lte("appointment_date", monthEndStr)
    .order("appointment_date", { ascending: true }),
    supabase
      .from("online_booking_requests")
      .select("id, status, created_at")
      .eq("organization_id", permissions.organizationId)
      .gte("created_at", monthStartIso)
      .lt("created_at", nextMonthStartIso),
  ]);

  if (appointmentError) {
    console.error("Reports appointment query failed:", {
      message: appointmentError.message,
      details: appointmentError.details,
      hint: appointmentError.hint,
      code: appointmentError.code,
    });
    throw new Error("Nije moguće dohvatiti reports podatke.");
  }

  const appointments: AppointmentRow[] = (appointmentData ?? []).map((item: any) => {
    const employee = getSingleRelation<any>(item.employee);
    const services = Array.isArray(item.appointment_services)
      ? [...item.appointment_services]
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
          .map((entry) => ({
            id: String(entry.service_id ?? ""),
            name: String(entry.service_name ?? "Usluga"),
          }))
      : [];

    return {
      id: String(item.id ?? ""),
      appointment_date: String(item.appointment_date ?? ""),
      status: item.status as AppointmentStatus,
      employee_id: item.employee_id ? String(item.employee_id) : null,
      employee: employee
        ? {
            id: String(employee.id ?? ""),
            display_name:
              [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
              "Zaposlenik",
          }
        : null,
      services,
    };
  });

  const todayAppointments = appointments.filter(
    (item) => item.appointment_date === todayStr,
  );
  const weekAppointments = appointments.filter(
    (item) =>
      item.appointment_date >= weekStartStr &&
      item.appointment_date <= weekEndStr,
  );
  const monthAppointments = appointments.filter(
    (item) =>
      item.appointment_date >= monthStartStr &&
      item.appointment_date <= monthEndStr,
  );

  const statusCounts = {
    scheduled: monthAppointments.filter(
      (item) => item.status === "scheduled" || item.status === "confirmed",
    ).length,
    completed: monthAppointments.filter((item) => item.status === "completed").length,
    cancelled: monthAppointments.filter((item) => item.status === "cancelled").length,
    no_show: monthAppointments.filter((item) => item.status === "no_show").length,
  };

  const totalMonthAppointments = monthAppointments.length;
  const completionRate = safeRate(statusCounts.completed, totalMonthAppointments);
  const noShowRate = safeRate(statusCounts.no_show, totalMonthAppointments);

  const employeeMap = new Map<string, { name: string; count: number }>();
  for (const item of monthAppointments) {
    if (!item.employee?.id) continue;
    const existing = employeeMap.get(item.employee.id);
    if (existing) existing.count += 1;
    else employeeMap.set(item.employee.id, { name: item.employee.display_name, count: 1 });
  }

  const serviceMap = new Map<string, { name: string; count: number }>();
  for (const item of monthAppointments) {
    for (const service of item.services) {
      if (!service.id) continue;
      const existing = serviceMap.get(service.id);
      if (existing) existing.count += 1;
      else serviceMap.set(service.id, { name: service.name, count: 1 });
    }
  }

  const topEmployees = Array.from(employeeMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const topServices = Array.from(serviceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const last14Days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(last14Start);
    date.setDate(last14Start.getDate() + index);
    const dateStr = formatDate(date);
    const dayAppointments = appointments.filter(
      (appointment) => appointment.appointment_date === dateStr,
    );
    return {
      date: dateStr,
      count: dayAppointments.length,
      completed: dayAppointments.filter((item) => item.status === "completed").length,
      no_show: dayAppointments.filter((item) => item.status === "no_show").length,
    };
  });

  const busiestDays = [...last14Days].sort((a, b) => b.count - a.count).slice(0, 5);

  if (onlineBookingError) {
    console.error("Reports online booking query failed:", {
      message: onlineBookingError.message,
      details: onlineBookingError.details,
      hint: onlineBookingError.hint,
      code: onlineBookingError.code,
    });
  }

  const onlineRows = onlineBookingError ? [] : (onlineBookingData ?? []);
  const onlineCounts = {
    total: onlineRows.length,
    pending: onlineRows.filter((item: any) => item.status === "pending").length,
    accepted: onlineRows.filter((item: any) => item.status === "accepted").length,
    rejected: onlineRows.filter((item: any) => item.status === "rejected").length,
  };
  const onlineConversionRate = safeRate(onlineCounts.accepted, onlineCounts.total);

  return {
    period: {
      today: todayStr,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      monthStart: monthStartStr,
      monthEnd: monthEndStr,
    },
    summary: {
      today: todayAppointments.length,
      week: weekAppointments.length,
      month: totalMonthAppointments,
      completedMonth: statusCounts.completed,
      scheduledMonth: statusCounts.scheduled,
      cancelledMonth: statusCounts.cancelled,
      noShowMonth: statusCounts.no_show,
      completionRate,
      noShowRate,
      onlineConversionRate,
    },
    statusCounts,
    onlineCounts,
    topEmployees,
    topServices,
    last14Days,
    busiestDays,
  };
}
